import { Badge } from "@/components/ui/badge";

export type StatusVariant =
	| "default"
	| "secondary"
	| "destructive"
	| "outline"
	| "warning";

export interface StatusConfig {
	label: string;
	variant: StatusVariant;
}

interface StatusBadgeProps {
	status: string;
	statusMap: Record<string, StatusConfig>;
}

export function StatusBadge({ status, statusMap }: StatusBadgeProps) {
	const config = statusMap[status] || {
		label: status,
		variant: "outline",
	};

	return <Badge variant={config.variant}>{config.label}</Badge>;
}
