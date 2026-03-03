import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDistanceToNow } from "@/helpers/date";

interface DateCellProps {
	date: Date | string | number;
}

export function DateCell({ date }: DateCellProps) {
	const dateObj = new Date(date);

	return (
		<Tooltip>
			<TooltipTrigger className="cursor-default">
				<span className="text-muted-foreground">
					{formatDistanceToNow(dateObj)}
				</span>
			</TooltipTrigger>
			<TooltipContent>{dateObj.toLocaleString()}</TooltipContent>
		</Tooltip>
	);
}
