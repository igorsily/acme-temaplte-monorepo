import { createRouter } from "@tanstack/react-router";
import Loader from "@/components/loader";
import { routeTree } from "@/routeTree.gen";
import { queryClient, trpc } from "./lib/trpc";

export const router = createRouter({
	routeTree,
	scrollRestoration: true,
	defaultPreload: "intent",
	defaultPreloadStaleTime: 30_000,
	context: {
		queryClient,
		trpc,
		auth: null,
	},
	defaultPendingComponent: () => <Loader />,
	defaultNotFoundComponent: () => <div>Not Found</div>,
});
