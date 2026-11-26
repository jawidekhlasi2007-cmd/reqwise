import { SiteHeader } from "@/components/site-header";
import { Architecture } from "@/components/landing/architecture";
import { Catches } from "@/components/landing/catches";
import { DemoWorkflow } from "@/components/landing/demo-workflow";
import { Faq } from "@/components/landing/faq";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { SiteFooter } from "@/components/landing/site-footer";
import { StandardsSection } from "@/components/landing/standards-section";

export default function LandingPage() {
  return (
    <>
      <SiteHeader landing />
      <main>
        <Hero />
        <Catches />
        <HowItWorks />
        <Architecture />
        <StandardsSection />
        <DemoWorkflow />
        <Faq />
      </main>
      <SiteFooter />
    </>
  );
}
