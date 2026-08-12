import { SignIn } from "@clerk/nextjs";
import { HomeSwipeLogo } from "@/components/HomeSwipeLogo";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 py-10">
      <div className="mb-8 text-center">
        <HomeSwipeLogo className="text-3xl mb-2" />
        <p className="text-muted-foreground text-sm">Find your perfect home, one swipe at a time.</p>
      </div>
      <SignIn signUpUrl="/sign-up" />
    </div>
  );
}
