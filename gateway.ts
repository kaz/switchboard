import { defaultTimeout, DiscordWebsocketAPI, Op } from "./wsapi";

const OpCodes = {
	OpDispatch: 0,
	OpHeartbeat: 1,
	OpIdentify: 2,
	OpVoiceStateUpdate: 4,
	OpInvalidSession: 9,
	OpHello: 10,
	OpHeartbeatAck: 11,
} as const;

type OpDispatch = Op & {
	op: typeof OpCodes.OpDispatch;
	d: object,
};
type OpHeartbeat = Op & {
	op: typeof OpCodes.OpHeartbeat;
	d: number | null;
};
type OpIdentify = Op & {
	op: typeof OpCodes.OpIdentify;
	d: {
		token: string;
		intents: number;
		properties: {
			$os: string;
			$browser: string;
			$device: string;
		};
	};
};
type OpVoiceStateUpdate = Op & {
	op: typeof OpCodes.OpVoiceStateUpdate;
	d: {
		guild_id: string;
		channel_id: string;
		self_mute: boolean;
		self_deaf: boolean;
	};
};
type OpInvalidSession = Op & {
	op: typeof OpCodes.OpInvalidSession;
	d: boolean;
};
type OpHello = Op & {
	op: typeof OpCodes.OpHello;
	d: {
		heartbeat_interval: number;
	};
};
type OpHeartbeatAck = Op & {
	op: typeof OpCodes.OpHeartbeatAck;
};

const EventNames = {
	EventReady: "READY",
	EventVoiceStateUpdate: "VOICE_STATE_UPDATE",
	EventVoiceServerUpdate: "VOICE_SERVER_UPDATE",
} as const;

type EventReady = OpDispatch & {
	t: typeof EventNames.EventReady;
	d: {
		// omitted
	};
};
type EventVoiceStateUpdate = OpDispatch & {
	t: typeof EventNames.EventVoiceStateUpdate;
	d: {
		guild_id: string;
		channel_id: string;
		user_id: string;
		session_id: string;
		// omitted
	};
};
type EventVoiceServerUpdate = OpDispatch & {
	t: typeof EventNames.EventVoiceServerUpdate;
	d: {
		endpoint: string;
		guild_id: string;
		token: string;
	};
};

export class DiscordGateway extends DiscordWebsocketAPI {
	async open(): Promise<void> {
		await super.open();

		const hello = await this.receive(OpCodes.OpHello);
		setInterval(() => {
			this.heartbeat();
		}, hello.d.heartbeat_interval);
	}

	private async heartbeat() {
		await this.send({ op: OpCodes.OpHeartbeat, d: this.seq });
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
			this.receive(OpCodes.OpDispatch, EventNames.EventReady),
			this.receive(OpCodes.OpInvalidSession),
			defaultTimeout(),
		]);
		if (!resp) {
			throw new Error("timed out");
		}
		if (resp.op == OpCodes.OpInvalidSession) {
			throw new Error("invalid session");
		}
		return resp;
	}
	async voiceStateUpdate(d: OpVoiceStateUpdate["d"]) {
		await this.send({ op: OpCodes.OpVoiceStateUpdate, d });
		const resp = await Promise.race([
			Promise.all([
				this.receive(OpCodes.OpDispatch, EventNames.EventVoiceStateUpdate),
				this.receive(OpCodes.OpDispatch, EventNames.EventVoiceServerUpdate),
			]),
			defaultTimeout(),
		]);
		if (!resp) {
			throw new Error("timed out");
		}
		return resp;
	}

	protected send(op: OpHeartbeat): Promise<void>;
	protected send(op: OpVoiceStateUpdate): Promise<void>;
	protected send(op: OpIdentify): Promise<void>;

	protected send(op: Op): Promise<void> {
		return super.send(op);
	}

	protected receive(opCode: typeof OpCodes.OpDispatch): Promise<OpDispatch>;
	protected receive(opCode: typeof OpCodes.OpHeartbeat): Promise<OpHeartbeat>;
	protected receive(opCode: typeof OpCodes.OpInvalidSession): Promise<OpInvalidSession>;
	protected receive(opCode: typeof OpCodes.OpHello): Promise<OpHello>;
	protected receive(opCode: typeof OpCodes.OpHeartbeatAck): Promise<OpHeartbeatAck>;

	protected receive(opCode: typeof OpCodes.OpDispatch, event: typeof EventNames.EventReady): Promise<EventReady>;
	protected receive(opCode: typeof OpCodes.OpDispatch, event: typeof EventNames.EventVoiceStateUpdate): Promise<EventVoiceStateUpdate>;
	protected receive(opCode: typeof OpCodes.OpDispatch, event: typeof EventNames.EventVoiceServerUpdate): Promise<EventVoiceServerUpdate>;

	protected receive(opCode?: number, event?: string): Promise<Op> {
		return super.receive(opCode, event);
	}
}
