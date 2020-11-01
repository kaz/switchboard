import { defaultTimeout, DiscordWebsocketAPI, Op } from "./wsapi";

const OpCodes = {
	OpIdentify: 0,
	OpReady: 2,
	OpHeartbeat: 3,
	OpHeartbeatAck: 6,
	OpHello: 8,
} as const;

type OpIdentify = Op & {
	op: typeof OpCodes.OpIdentify;
	d: {
		server_id: string;
		user_id: string;
		session_id: string;
		token: string;
	};
};
type OpReady = Op & {
	op: typeof OpCodes.OpReady;
	d: {
		ssrc: number;
		ip: string;
		port: number;
		modes: string[];
		heartbeat_interval: number; // erroneous field
	};
};
type OpHeartbeat = Op & {
	op: typeof OpCodes.OpHeartbeat;
	d: number;
};
type OpHeartbeatAck = Op & {
	op: typeof OpCodes.OpHeartbeatAck;
	d: number;
};
type OpHello = Op & {
	op: typeof OpCodes.OpHello;
	d: {
		heartbeat_interval: number;
	};
};

export class DiscordVoiceGateway extends DiscordWebsocketAPI {
	async open(): Promise<void> {
		await super.open();

		const hello = await this.receive(OpCodes.OpHello);
		setInterval(() => {
			this.heartbeat();
		}, hello.d.heartbeat_interval);
	}

	private async heartbeat() {
		await this.send({ op: OpCodes.OpHeartbeat, d: new Date().getTime() });
		const resp = await Promise.race([
			this.receive(OpCodes.OpHeartbeatAck),
			defaultTimeout(),
		]);
		if (!resp) {
			throw new Error("timed out");
		}
	}

	async identify(d: OpIdentify["d"]) {
		await this.send({ op: OpCodes.OpIdentify, d });
		const resp = await Promise.race([
			this.receive(OpCodes.OpReady),
			defaultTimeout(),
		]);
		if (!resp) {
			throw new Error("timed out");
		}
		return resp;
	}

	protected send(op: OpIdentify): Promise<void>;
	protected send(op: OpHeartbeat): Promise<void>;

	protected send(op: Op): Promise<void> {
		return super.send(op);
	}

	protected receive(): Promise<Op>;
	protected receive(opCode: typeof OpCodes.OpHeartbeatAck): Promise<OpHeartbeatAck>;
	protected receive(opCode: typeof OpCodes.OpReady): Promise<OpReady>;
	protected receive(opCode: typeof OpCodes.OpHello): Promise<OpHello>;

	protected receive(opCode?: number, event?: string): Promise<Op> {
		return super.receive(opCode, event);
	}
}
