import { createFileRoute } from "@tanstack/react-router";
import { SignInForm } from "@/features/auth/sign-in-form";

export const Route = createFileRoute("/_public/login")({
	component: RouteComponent,
});

function RouteComponent() {
	return <SignInForm />;
}
