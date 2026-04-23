"use client";
import useFcmRegistration from "@/hooks/useFcmRegistration";

export default function FcmInitializer() {
  useFcmRegistration();
  return null;
}

