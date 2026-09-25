import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { sendMail, isValidEmail } from "@/lib/mailer";
import { changeEmailTemplate } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { idToken, newEmail } = await req.json();

    if (!idToken || !isValidEmail(newEmail)) {
      return NextResponse.json({ error: "Missing or invalid fields." }, { status: 400 });
    }

    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifyIdToken(idToken);
    const currentEmail = decoded.email;
    if (!currentEmail) {
      return NextResponse.json({ error: "Current account has no email on file." }, { status: 400 });
    }

    if (newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      return NextResponse.json({ error: "New email is the same as your current email." }, { status: 400 });
    }

    try {
      await adminAuth.getUserByEmail(newEmail);
      return NextResponse.json({ error: "That email is already in use by another account." }, { status: 409 });
    } catch (err: any) {
      if (err?.code !== "auth/user-not-found") throw err;
    }

    const actionCodeSettings = {
      // new URL() normalizes a trailing slash in NEXT_PUBLIC_APP_URL (avoids "//auth/login")
      url: new URL("/auth/login", process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).toString(),
      handleCodeInApp: false,
    };

    const link = await adminAuth.generateVerifyAndChangeEmailLink(currentEmail, newEmail, actionCodeSettings);

    const shopSnap = await getAdminDb().collection("shopSettings").doc("main").get();
    const shopName = (shopSnap.exists ? shopSnap.data()?.name : null) || "M-Fixpro";

    await sendMail(
      newEmail,
      `Confirm your new email - ${shopName}`,
      changeEmailTemplate(newEmail, link, shopName, currentEmail)
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("change-email error:", err);
    if (err?.code === "auth/id-token-expired" || err?.code === "auth/argument-error") {
      return NextResponse.json({ error: "Your session expired. Please sign in again." }, { status: 401 });
    }
    if (err?.code === "auth/unauthorized-continue-uri" || err?.code === "auth/invalid-continue-uri") {
      return NextResponse.json(
        { error: `App URL is not an authorized domain in Firebase (${err.code}). Add it under Authentication → Settings → Authorized domains.` },
        { status: 500 }
      );
    }
    if (err?.code === "EAUTH" || err?.code === "ESOCKET" || err?.code === "ETIMEDOUT" || err?.code === "ECONNECTION") {
      return NextResponse.json({ error: "Mail server rejected the request. Check the MAIL_* settings." }, { status: 500 });
    }
    if (typeof err?.message === "string" && err.message.startsWith("Missing ")) {
      return NextResponse.json({ error: "Server is missing configuration. Check the environment variables." }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to send verification email. Please try again." }, { status: 500 });
  }
}
