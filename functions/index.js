const functions = require("firebase-functions/v2");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Configured via environment variables for security.
// Use: firebase functions:config:set gmail.email="your-email" gmail.password="your-app-password"
// Or use Google Cloud Secret Manager for production.
const gmailEmail = process.env.GMAIL_EMAIL || functions.config().gmail?.email || "YOUR_GMAIL_HERE@gmail.com";
const gmailPassword = process.env.GMAIL_PASSWORD || functions.config().gmail?.password || "YOUR_APP_PASSWORD";

const mailTransport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: gmailEmail,
    pass: gmailPassword,
  },
});

exports.monthlyReportCron = functions.scheduler.onSchedule("0 9 1 * *", async (event) => {
  const db = admin.firestore();
  console.log("Starting monthly report cron job...");

  try {
    const usersSnap = await db.collection("users").get();
    
    // We get last month's start/end dates
    const now = new Date();
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const promises = usersSnap.docs.map(async (userDoc) => {
      const userData = userDoc.data();
      const userEmail = userData.email;
      
      if (!userEmail) return;

      // Calculate monthly stats
      const ridesSnap = await db.collection("rides")
        .where("userId", "==", userDoc.id)
        .where("date", ">=", firstDayLastMonth)
        .where("date", "<=", lastDayLastMonth)
        .get();

      const expensesSnap = await db.collection("expenses")
        .where("userId", "==", userDoc.id)
        .where("date", ">=", firstDayLastMonth)
        .where("date", "<=", lastDayLastMonth)
        .get();

      let monthKm = 0;
      ridesSnap.forEach(r => { monthKm += r.data().km; });
      
      let monthExpense = 0;
      expensesSnap.forEach(e => { monthExpense += e.data().amount; });

      const emailContent = `
        <h2>BikeCare Tracker - Monthly Report</h2>
        <p>Hello ${userEmail.split('@')[0]},</p>
        <p>Here is your bike report for the last month:</p>
        <ul>
          <li><strong>Distance Ridden:</strong> ${monthKm.toFixed(1)} km</li>
          <li><strong>Expenses:</strong> ₹${monthExpense.toFixed(2)}</li>
        </ul>
        <p>Current Total Distance: ${userData.totalKm.toFixed(1)} km</p>
        <p>Oil Change Limit: ${userData.oilChangeLimit} km</p>
        <br/>
        <p>Keep riding safely!</p>
      `;

      const mailOptions = {
        from: `"BikeCare Tracker" <${gmailEmail}>`,
        to: userEmail,
        subject: "Your Monthly BikeCare Report 🏍️",
        html: emailContent,
      };

      await mailTransport.sendMail(mailOptions);
      console.log(`Report sent to ${userEmail}`);
    });

    await Promise.all(promises);
    console.log("All monthly reports sent successfully.");
  } catch (error) {
    console.error("Error sending monthly reports:", error);
  }
});

exports.documentExpiryNotifier = functions.scheduler.onSchedule("0 8 * * *", async () => {
  const db = admin.firestore();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiryTargets = [30, 7, 1];

  try {
    const docsSnap = await db.collectionGroup("documents").get();
    for (const docSnap of docsSnap.docs) {
      const data = docSnap.data() || {};
      const expiryDateRaw = data.expiryDate;
      const expiryDate = expiryDateRaw?.toDate ? expiryDateRaw.toDate() : null;
      if (!expiryDate) continue;

      const daysLeft = Math.ceil((expiryDate.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000));
      if (!expiryTargets.includes(daysLeft)) continue;

      const alreadyNotified = Array.isArray(data.notifiedDays)
        ? data.notifiedDays.includes(String(daysLeft))
        : false;
      if (alreadyNotified) continue;

      const segments = docSnap.ref.path.split("/");
      // users/{uid}/bikes/{bikeId}/documents/{docId}
      if (segments.length < 6) continue;
      const uid = segments[1];
      const bikeId = segments[3];

      const userSnap = await db.collection("users").doc(uid).get();
      const userData = userSnap.exists ? userSnap.data() || {} : {};
      const tokens = Array.isArray(userData.fcmTokens) ? userData.fcmTokens.filter(Boolean) : [];
      if (!tokens.length) continue;

      const title = "Document Expiry Reminder";
      const body = `${data.type || "Document"} "${data.fileName || "file"}" expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`;

      await admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: {
          bikeId: String(bikeId),
          documentId: String(docSnap.id),
          daysLeft: String(daysLeft),
          route: "/documents",
        },
      });

      await docSnap.ref.update({
        notifiedDays: admin.firestore.FieldValue.arrayUnion(String(daysLeft)),
      });
    }
    console.log("Document expiry notifier run complete.");
  } catch (err) {
    console.error("Document expiry notifier error:", err);
  }
});
