import dotenv from "dotenv";

import { DiscordGateway } from "./gateway";
import { DiscordVoiceGateway } from "./voice";

const main = async () => {
	const token = process.env.DISCORD_TOKEN || "";
	const guild = process.env.DISCORD_GUILD || "";
	const channel = process.env.DISCORD_CHANNEL || "";

	const gw = new DiscordGateway("wss://gateway.discord.gg/?v=8");
	await gw.open();
	await gw.identify({
		token: token,
		intents: 1 << 7,
		properties: {
			$os: "switchboard",
			$device: "switchboard",
			$browser: "switchboard",
		},
	});
	const [vstate, vserver] = await gw.voiceStateUpdate({
		guild_id: guild,
		channel_id: channel,
		self_mute: false,
		self_deaf: false,
	});

	const vgw = new DiscordVoiceGateway(`wss://${vserver.d.endpoint}/?v=4`);
	await vgw.open();
	await vgw.identify({
		server_id: vserver.d.guild_id,
		user_id: vstate.d.user_id,
		session_id: vstate.d.session_id,
		token: vserver.d.token,
	});
};

dotenv.config();
main().catch(console.trace);
