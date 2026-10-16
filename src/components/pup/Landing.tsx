import { CalendarClock, QrCode, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import hero from "@/assets/campus-hero.jpg";

export function Landing({ onSignIn, onRegister }: { onSignIn: () => void; onRegister: () => void }) {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <img src={hero} alt="PUP San Pedro campus at golden hour" width={1600} height={912} className="absolute inset-0 -z-10 size-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-hero-overlay" />
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 md:py-36">
          <p className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-primary-deep/40 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-gold backdrop-blur">
            Office of Campus Facilities
          </p>
          <h1 className="mt-6 max-w-3xl font-display text-4xl font-semibold leading-[1.05] text-primary-foreground md:text-6xl">
            Equipment &amp; Room <span className="text-gold-gradient">Reservation</span> Management
          </h1>
          <p className="mt-5 max-w-xl text-lg text-primary-foreground/80">
            Book classrooms, projectors and campus equipment for your section — with live availability and verified pickup passes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" variant="gold" onClick={onSignIn}>Sign in</Button>
            <Button size="lg" variant="glass" onClick={onRegister}>Register as President</Button>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-14 sm:px-6 md:grid-cols-3">
        {[
          { icon: CalendarClock, t: "Live hourly timetable", d: "See every free and booked hour from 07:00 to 19:00 before you request." },
          { icon: QrCode, t: "Official pickup voucher", d: "Approved bookings issue a single-use token and QR pass for the admin desk." },
          { icon: ShieldCheck, t: "Accountable operations", d: "Every login, approval, pickup and return is recorded in the audit trail." },
        ].map(({ icon: I, t, d }) => (
          <div key={t} className="rounded-xl border bg-card p-6 shadow-card">
            <span className="grid size-10 place-items-center rounded-lg bg-accent text-primary"><I className="size-5" /></span>
            <h3 className="mt-4 font-semibold">{t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </section>
    </>
  );
}
