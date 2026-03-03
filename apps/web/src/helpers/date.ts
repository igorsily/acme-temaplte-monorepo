import { formatDistanceToNow as dateFnsDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatDistanceToNow(date: Date | string | number): string {
	return dateFnsDistanceToNow(new Date(date), {
		addSuffix: true,
		locale: ptBR,
	});
}
