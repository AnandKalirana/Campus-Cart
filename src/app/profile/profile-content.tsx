"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, User, Eye, EyeOff, CheckCircle, AlertCircle, Download } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  universityId: string | null;
  role: "STUDENT" | "ADMIN";
}

interface ProfileContentProps {
  user: User;
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return <label htmlFor={htmlFor} className="font-raw block mb-2 text-sm tracking-widest uppercase">{children}</label>;
}

function InputWrapper({ children, error }: { children: React.ReactNode; error?: string }) {
  return (
    <div className="relative">
      {children}
      {error && (
        <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-red-600" role="alert">
          <AlertCircle size={12} aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

function SuccessToast({ message }: { message: string }) {
  return (
    <div className="mb-6 flex items-center gap-3 border-2 border-black bg-cc-green px-4 py-3" role="status">
      <CheckCircle size={20} aria-hidden />
      <span className="font-bold">{message}</span>
    </div>
  );
}

function Section({ title, children, description }: { title: string; children: React.ReactNode; description?: string }) {
  return (
    <section className="bru-card p-6 md:p-8" aria-labelledby={title.toLowerCase().replace(/\s+/g, "-")}>
      <header className="mb-6">
        <h2 id={title.toLowerCase().replace(/\s+/g, "-")} className="font-raw text-2xl md:text-3xl">{title}</h2>
        {description && <p className="mt-1 text-lg font-bold text-cc-muted">{description}</p>}
      </header>
      {children}
    </section>
  );
}

export function ProfileContent({ user }: ProfileContentProps) {
  const firstName = user.name.trim().split(/\s+/)[0] || "you";

  // Name form state
  const [name, setName] = useState(user.name);
  const [nameError, setNameError] = useState("");
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameLoading, setNameLoading] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Email verification state
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError("");
    setNameSuccess(false);

    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setNameError("Name must be at least 2 characters");
      return;
    }
    if (trimmed.length > 80) {
      setNameError("Name must be under 80 characters");
      return;
    }
    if (trimmed === user.name) {
      setNameError("That's already your name");
      return;
    }

    setNameLoading(true);
    try {
      const res = await fetch("/api/profile/name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to update name");
      setNameSuccess(true);
      setName(trimmed);
      // Update the user object in parent would need a refresh, but we show success
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setNameLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError("Enter your current password");
      return;
    }
    if (newPassword.length < 10) {
      setPasswordError("New password must be at least 10 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match");
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from current");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to update password");
      setPasswordSuccess(true);
      // The server ends every session on a password change (including this one), so send them to log in again.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload on purpose: the old session is dead
      setTimeout(() => { window.location.assign("/login?next=%2Fprofile"); }, 2000);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPasswordLoading(false);
    }
  };

  // Delete account state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError("");
    if (!deletePassword) { setDeleteError("Enter your password"); return; }
    if (deleteConfirm !== "DELETE") { setDeleteError("Type DELETE in capital letters to confirm"); return; }
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword, confirm: deleteConfirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "We couldn't delete your account. Nothing was deleted. Please try again.");
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload on purpose: the session no longer exists
      window.location.assign("/");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Something went wrong. Nothing was deleted.");
      setDeleteLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setVerifyError("");
    setVerifySuccess(false);
    setVerifyLoading(true);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to send verification email");
      setVerifySuccess(true);
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-[760px] px-5 pb-16 pt-12">
      <header className="mb-10">
        <p className="font-raw inline-block border-4 border-black bg-cc-sky px-3 py-1 text-xs tracking-widest md:text-sm">Account settings</p>
        <h1 className="font-raw mt-4 text-[clamp(2.25rem,6vw,3.75rem)] leading-[0.95]">Wassup, {firstName}.</h1>
        <p className="mt-2 text-lg font-bold">Manage your name, password, and email verification.</p>
      </header>

      {/* Profile Info Card */}
      <div className="mb-8 bru-card p-6 md:p-8 bg-white">
        <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-full border-4 border-black bg-cc-orange font-raw text-2xl text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-raw text-2xl">{user.name}</p>
              <p className="text-sm font-bold text-cc-muted">{user.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!user.emailVerified && (
              <span className="font-raw inline-flex items-center gap-1.5 border-2 border-black bg-cc-yellow px-3 py-1 text-xs">
                <Mail size={12} aria-hidden /> Email not verified
              </span>
            )}
            <span className={`font-raw inline-flex items-center gap-1.5 border-2 border-black px-3 py-1 text-xs ${
              user.role === "ADMIN" ? "bg-cc-red text-white" : "bg-cc-green"
            }`}>
              {user.role === "ADMIN" ? "Admin" : "Student"}
            </span>
          </div>
        </div>
      </div>

      {/* Change Name */}
      <Section title="Name" description="This is how you'll appear on listings and messages.">
        {nameSuccess && <SuccessToast message="Name updated successfully" />}
        <form onSubmit={handleNameSubmit} className="space-y-4 max-w-md">
          <FieldLabel htmlFor="name">Display name</FieldLabel>
          <InputWrapper error={nameError}>
            <input
              id="name"
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setNameError(""); setNameSuccess(false); }}
              className={"bru-input w-full"}
              disabled={nameLoading}
              autoComplete="name"
            />
          </InputWrapper>
          <button type="submit" className="bru-btn h-12 bg-black px-6 text-base text-white" disabled={nameLoading}>
            {nameLoading ? "Saving..." : "Save name"}
          </button>
        </form>
      </Section>

      {/* Change Password */}
      <Section title="Password" description="Your current password is required to set a new one.">
        {passwordSuccess && <SuccessToast message="Password updated. Please log in again." />}
        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
          <FieldLabel htmlFor="currentPassword">Current password</FieldLabel>
          <InputWrapper error={passwordError}>
            <div className="relative">
              <input
                id="currentPassword"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={e => { setCurrentPassword(e.target.value); setPasswordError(""); setPasswordSuccess(false); }}
                className={"bru-input w-full pr-12"}
                disabled={passwordLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cc-muted hover:text-black"
                aria-label={showCurrent ? "Hide password" : "Show password"}
              >
                {showCurrent ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </InputWrapper>

          <FieldLabel htmlFor="newPassword">New password</FieldLabel>
          <InputWrapper error={passwordError}>
            <div className="relative">
              <input
                id="newPassword"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setPasswordError(""); setPasswordSuccess(false); }}
                className={"bru-input w-full pr-12"}
                disabled={passwordLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cc-muted hover:text-black"
                aria-label={showNew ? "Hide password" : "Show password"}
              >
                {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </InputWrapper>

          <FieldLabel htmlFor="confirmPassword">Confirm new password</FieldLabel>
          <InputWrapper error={passwordError}>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setPasswordError(""); setPasswordSuccess(false); }}
                className={"bru-input w-full pr-12"}
                disabled={passwordLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cc-muted hover:text-black"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </InputWrapper>

          <button type="submit" className="bru-btn h-12 bg-black px-6 text-base text-white" disabled={passwordLoading}>
            {passwordLoading ? "Updating..." : "Update password"}
          </button>
        </form>
      </Section>

      {/* Email Verification */}
      <Section title="Email verification" description="Verified emails unlock selling, messaging, and purchase requests.">
        {verifySuccess && <SuccessToast message="Verification email sent! Check your inbox." />}
        {verifyError && (
          <div className="mb-4 flex items-center gap-2 border-2 border-black bg-cc-pink px-4 py-3" role="alert">
            <AlertCircle size={20} aria-hidden />
            <span className="font-bold">{verifyError}</span>
          </div>
        )}
        {!user.emailVerified ? (
          <div className="flex flex-col gap-3 max-w-md md:flex-row md:items-center">
            <p className="font-bold">Your email <strong>{user.email}</strong> isn&apos;t verified yet.</p>
            <button
              type="button"
              onClick={handleResendVerification}
              className="bru-btn h-12 bg-cc-orange px-6 text-base self-start"
              disabled={verifyLoading}
            >
              {verifyLoading ? "Sending..." : "Resend verification email"}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600" aria-hidden />
            <p className="font-bold">Email verified — you&apos;re all set.</p>
          </div>
        )}
      </Section>

      {/* Your data */}
      <Section title="Your data" description="Download a copy of everything we hold about you.">
        <p className="mb-4 max-w-md font-bold">A JSON file with your profile, listings, saved items, chats, offers and reports. Photos and other students&apos; names and emails are not included.</p>
        <a href="/api/account/export" download className="bru-btn inline-flex h-12 items-center gap-2 bg-cc-sky px-6 text-base">
          <Download size={18} aria-hidden /> Download my data
        </a>
      </Section>

      {/* Danger Zone */}
      <Section title="Danger zone" description="Irreversible actions.">
        <div className="bru-card border-4 border-cc-pink bg-white p-6">
          <p className="font-raw text-lg">Delete account</p>
          <p className="mt-1 max-w-xl text-sm font-bold text-cc-muted">
            Permanently removes your account, listings, photos, saved items, offers and chats. Chats with other students disappear for them too. This cannot be undone, so download your data first if you want a copy.
          </p>
          {user.role === "ADMIN" ? (
            <p className="mt-4 border-2 border-black bg-cc-yellow px-4 py-3 font-bold" role="note">Admin accounts can&apos;t be deleted here. Ask another admin to remove your admin role first.</p>
          ) : !deleteOpen ? (
            <button type="button" onClick={() => setDeleteOpen(true)} className="bru-btn mt-4 h-12 bg-cc-pink px-6 text-base text-black">
              Delete my account…
            </button>
          ) : (
            <form onSubmit={handleDeleteSubmit} className="mt-4 max-w-md space-y-4" aria-describedby={deleteError ? "delete-error" : undefined}>
              <div>
                <FieldLabel htmlFor="deletePassword">Your password</FieldLabel>
                <input id="deletePassword" type="password" value={deletePassword} onChange={e => { setDeletePassword(e.target.value); setDeleteError(""); }} className="bru-input w-full" disabled={deleteLoading} autoComplete="current-password" required />
              </div>
              <div>
                <FieldLabel htmlFor="deleteConfirm">Type DELETE to confirm</FieldLabel>
                <input id="deleteConfirm" type="text" value={deleteConfirm} onChange={e => { setDeleteConfirm(e.target.value); setDeleteError(""); }} className="bru-input w-full" disabled={deleteLoading} autoComplete="off" autoCapitalize="characters" spellCheck={false} required />
              </div>
              {deleteError && (
                <p id="delete-error" className="flex items-center gap-1.5 text-sm font-bold text-red-700" role="alert">
                  <AlertCircle size={14} aria-hidden /> {deleteError}
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                <button type="submit" className="bru-btn h-12 bg-black px-6 text-base text-white" disabled={deleteLoading}>
                  {deleteLoading ? "Deleting…" : "Permanently delete my account"}
                </button>
                <button type="button" onClick={() => { setDeleteOpen(false); setDeletePassword(""); setDeleteConfirm(""); setDeleteError(""); }} className="bru-btn h-12 bg-white px-6 text-base" disabled={deleteLoading}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </Section>

      <Link href="/dashboard" className="mt-8 inline-flex items-center gap-2 text-lg font-bold underline decoration-2 underline-offset-4 hover:bg-black hover:text-white">
        <User size={20} aria-hidden /> Back to dashboard
      </Link>
    </section>
  );
}