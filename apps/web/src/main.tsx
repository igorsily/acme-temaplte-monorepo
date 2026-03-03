import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import { authClient } from "./lib/auth-client";
import { queryClient } from "./lib/trpc";
import { router } from "./router";
import "./index.css";

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

function App() {
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return (
			<div className="flex h-screen w-full items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
			</div>
		);
	}

	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="dark"
			disableTransitionOnChange
			storageKey="telemetria-ui-theme"
		>
			<QueryClientProvider client={queryClient}>
				<NuqsAdapter>
					<RouterProvider context={{ auth: session }} router={router} />
				</NuqsAdapter>
				<Toaster position="top-right" />
			</QueryClientProvider>
		</ThemeProvider>
	);
}

const rootElement = document.getElementById("app");

if (!rootElement) {
	throw new Error("Root element not found");
}
if (!rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(<App />);
}
