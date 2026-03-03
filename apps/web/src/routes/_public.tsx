import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_public")({
	beforeLoad: ({ context }) => {
		if (context.auth) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: PublicLayout,
});

function PublicLayout() {
	return (
		<div className="flex min-h-screen">
			<Outlet />
		</div>
	);
}
