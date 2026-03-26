import {
  DiscordAPIError,
  MessageFlags,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type EmbedBuilder,
  type ModalBuilder,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from 'discord.js';
import { logger } from './logger.js';

type AnyRepliableInteraction =
  | ChatInputCommandInteraction
  | ButtonInteraction
  | ModalSubmitInteraction
  | StringSelectMenuInteraction;

const DISCORD_UNKNOWN_INTERACTION = 10062;
const DISCORD_ALREADY_ACKNOWLEDGED = 40060;
const DISCORD_INTERACTION_NOT_ACTIVE = 40004;

function isInteractionLifecycleError(error: unknown): boolean {
  if (error instanceof DiscordAPIError) {
    return [
      DISCORD_UNKNOWN_INTERACTION,
      DISCORD_ALREADY_ACKNOWLEDGED,
      DISCORD_INTERACTION_NOT_ACTIVE,
    ].includes(error.code as number);
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('unknown interaction') ||
      msg.includes('already been acknowledged') ||
      msg.includes('not active')
    );
  }

  return false;
}

export function interactionAge(interaction: AnyRepliableInteraction): number {
  return Date.now() - interaction.createdTimestamp;
}

export function isInteractionExpired(interaction: AnyRepliableInteraction): boolean {
  return interactionAge(interaction) > 2500;
}

export async function safeDeferReply(
  interaction: AnyRepliableInteraction,
  label?: string,
): Promise<boolean> {
  if (interaction.deferred || interaction.replied) {
    return true;
  }

  const age = interactionAge(interaction);
  if (age > 2800) {
    logger.warn(`[${label ?? interaction.id}] Interaction too old (${age}ms), skipping deferReply.`);
    return false;
  }

  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    return true;
  } catch (error) {
    if (isInteractionLifecycleError(error)) {
      logger.warn(`[${label ?? interaction.id}] deferReply skipped: ${error instanceof Error ? error.message : error}`);
      return false;
    }

    throw error;
  }
}

export async function safeReply(
  interaction: AnyRepliableInteraction,
  embeds: EmbedBuilder[],
): Promise<boolean> {
  if (interaction.deferred || interaction.replied) {
    return safeEditReply(interaction, embeds);
  }

  try {
    await interaction.reply({ flags: MessageFlags.Ephemeral, embeds });
    return true;
  } catch (error) {
    if (isInteractionLifecycleError(error)) {
      logger.warn(`[${interaction.id}] reply skipped: ${error instanceof Error ? error.message : error}`);
      return false;
    }

    throw error;
  }
}

export async function safeEditReply(
  interaction: AnyRepliableInteraction,
  embeds: EmbedBuilder[],
): Promise<boolean> {
  try {
    await interaction.editReply({ embeds });
    return true;
  } catch (error) {
    if (isInteractionLifecycleError(error)) {
      logger.warn(`[${interaction.id}] editReply skipped: ${error instanceof Error ? error.message : error}`);
      return false;
    }

    throw error;
  }
}

export async function safeShowModal(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  modal: ModalBuilder,
  label?: string,
): Promise<boolean> {
  if (interaction.deferred || interaction.replied) {
    logger.warn(`[${label ?? interaction.id}] Cannot show modal: interaction already acknowledged.`);
    return false;
  }

  const age = interactionAge(interaction);
  if (age > 2500) {
    logger.warn(`[${label ?? interaction.id}] Interaction too old (${age}ms), skipping showModal.`);
    return false;
  }

  try {
    await interaction.showModal(modal);
    return true;
  } catch (error) {
    if (isInteractionLifecycleError(error)) {
      logger.warn(`[${label ?? interaction.id}] showModal skipped (${age}ms old): ${error instanceof Error ? error.message : error}`);
      return false;
    }

    throw error;
  }
}

export { isInteractionLifecycleError };
