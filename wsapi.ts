import WebSocket from "ws";

export type Op = {
	op: number,
	s?: number | null,
	t?: string | null,
};

export const timeout = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
export const defaultTimeout = () => timeout(5000);

export class DiscordWebsocketAPI {
	protected ws: WebSocket;
	protected seq: number | null = null;

	constructor(url: string) {
		this.ws = new WebSocket(url);
	}

	protected async open(): Promise<void> {
		await new Promise((resolve, reject) => {
			this.ws.on("open", resolve);
			this.ws.on("error", reject);
		});
		this.ws.removeAllListeners();
	}

	protected send(op: Op): Promise<void> {
		return new Promise((resolve, reject) => {
			this.ws.send(JSON.stringify(op), err => {
				if (err) {
					reject(err);
				} else {
					console.log("sent >>>", op);
					resolve();
				}
			});
		});
	}

	protected receive(opCode?: number, event?: string): Promise<Op> {
		return new Promise((resolve, reject) => {
			const onmessage = (data: string) => {
				const op: Op = JSON.parse(data);
				if (opCode && opCode != op.op) {
					return;
				}
				if (event && event != op.t) {
					return;
				}

				this.ws.off("message", onmessage);
				this.ws.off("close", onclose);
				this.ws.off("error", onerror);

				if (op.s) {
					this.seq = op.s;
				}

				console.log("received <<<", op);
				resolve(op);
			};
			const onclose = (code: number, reason: string) => {
				reject(new Error(`connection closed. code=${code} reason=${reason}`));
			};
			const onerror = (err: Error) => {
				reject(err);
			};
			this.ws.on("message", onmessage);
			this.ws.on("close", onclose);
			this.ws.on("error", onerror);
		});
	}
}
