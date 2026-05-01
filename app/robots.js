export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/settings/"],
    },
    sitemap: "https://myvehiclecares.vercel.app/sitemap.xml",
  };
}
