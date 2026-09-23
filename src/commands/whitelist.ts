import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { createEmbed, successEmbed, infoEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError, replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { isBotOwner } from '../../config/bot.js';
import { getGuildConfig, setGuildConfig } from '../../services/config/guildConfig.js';
import { getColor } from '../../config/bot.js';

export default {
 data: new SlashCommandBuilder()
 .setName("wl")
 .setDescription("Manage the embed edit whitelist")
 .addSubcommand((subcommand) =>
 subcommand
 .setName("add")
 .setDescription("Add a user to the embed edit whitelist")
 .addUserOption((option) =>
 option
 .setName("user")
 .setDescription("User to add to whitelist")
 .setRequired(true),
 ),
 )
 .addSubcommand((subcommand) =>
 subcommand
 .setName("remove")
 .setDescription("Remove a user from the embed edit whitelist")
 .addUserOption((option) =>
 option
 .setName("user")
 .setDescription("User to remove from whitelist")
 .setRequired(true),
 ),
 )
 .addSubcommand((subcommand) =>
 subcommand
 .setName("list")
 .setDescription("Show all whitelisted users"),
 ),
 category: "utility",
 async execute(interaction, config, client) {
 const deferred = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
 if (!deferred) {
 return;
 }

 // Only bot owner can manage whitelist
 if (!isBotOwner(interaction.user.id)) {
 return await replyUserError(interaction, {
 type: ErrorTypes.PERMISSION,
 message: "Only the bot owner can manage the whitelist.",
 });
 }

 const subcommand = interaction.options.getSubcommand();
 const guildId = interaction.guildId;

 try {
 const guildConfig = await getGuildConfig(client, guildId);
 
 // Initialize whitelist if it doesn't exist
 if (!guildConfig.embedEditWhitelist) {
 guildConfig.embedEditWhitelist = [];
 }

 if (subcommand === "add") {
 const user = interaction.options.getUser("user");
 
 if (guildConfig.embedEditWhitelist.includes(user.id)) {
 return await replyUserError(interaction, {
 type: ErrorTypes.UNKNOWN,
 message: `${user.tag} is already whitelisted.`,
 });
 }

 guildConfig.embedEditWhitelist.push(user.id);
 await setGuildConfig(client, guildId, guildConfig);

 logger.info("User added to embed whitelist", {
 userId: user.id,
 userTag: user.tag,
 guildId: guildId,
 moderatorId: interaction.user.id,
 });

 return await InteractionHelper.safeEditReply(interaction, {
 embeds: [
 successEmbed(
 "User Added to Whitelist",
 `✅ ${user.tag} can now edit embeds.`,
 ),
 ],
 });
 }

 if (subcommand === "remove") {
 const user = interaction.options.getUser("user");

 if (!guildConfig.embedEditWhitelist.includes(user.id)) {
 return await replyUserError(interaction, {
 type: ErrorTypes.UNKNOWN,
 message: `${user.tag} is not whitelisted.`,
 });
 }

 guildConfig.embedEditWhitelist = guildConfig.embedEditWhitelist.filter(
 (id) => id !== user.id,
 );
 await setGuildConfig(client, guildId, guildConfig);

 logger.info("User removed from embed whitelist", {
 userId: user.id,
 userTag: user.tag,
 guildId: guildId,
 moderatorId: interaction.user.id,
 });

 return await InteractionHelper.safeEditReply(interaction, {
 embeds: [
 successEmbed(
 "User Removed from Whitelist",
 `❌ ${user.tag} can no longer edit embeds.`,
 ),
 ],
 });
 }

 if (subcommand === "list") {
 if (guildConfig.embedEditWhitelist.length === 0) {
 return await InteractionHelper.safeEditReply(interaction, {
 embeds: [
 infoEmbed(
 "Embed Edit Whitelist",
 "No users are currently whitelisted.",
 ),
 ],
 });
 }

 const userList = guildConfig.embedEditWhitelist
 .map((id) => `<@${id}>`)
 .join("\n");

 return await InteractionHelper.safeEditReply(interaction, {
 embeds: [
 createEmbed({
 title: "Embed Edit Whitelist",
 description: userList,
 color: getColor("info"),
 }),
 ],
 });
 }
 } catch (error) {
 logger.error("Whitelist command error", {
 error: error.message,
 stack: error.stack,
 userId: interaction.user.id,
 guildId: interaction.guildId,
 subcommand: subcommand,
 });

 return await handleInteractionError(interaction, error, {
 commandName: "whitelist",
 source: "whitelist_command",
 });
 }
 },
};
