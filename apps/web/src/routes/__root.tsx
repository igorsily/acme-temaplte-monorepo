import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import type { trpc } from "@/lib/trpc";

import "../index.css";

import type { authClient } from "@/lib/auth-client";

export interface RouterAppContext {
	auth: typeof authClient.$Infer.Session | null;
	queryClient: QueryClient;
	trpc: typeof trpc;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootComponent,
	head: () => ({
		meta: [
			{
				title: "Acme Inc.",
			},
			{
				name: "description",
				content: "Acme Inc. ",
			},
		],
		links: [
			{
				rel: "icon",
				href: "/favicon.ico",
			},
		],
	}),
});

function RootComponent() {
	return <Outlet />;
}
