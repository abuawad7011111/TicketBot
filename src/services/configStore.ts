import { loadConfig } from '../config/loadConfig.js';
import type { AppConfig, EmojiConfig, GuildConfig, PanelConfig } from '../types/config.js';

export class ConfigStore {
  private config: AppConfig;

  public constructor(private readonly configPath: string) {
    this.config = loadConfig(configPath);
  }

  public get current(): AppConfig {
    return this.config;
  }

  public reload(): AppConfig {
    this.config = loadConfig(this.configPath);
    return this.config;
  }

  public patchGuild(patch: Partial<GuildConfig>): void {
    this.config = {
      ...this.config,
      guild: { ...this.config.guild, ...patch },
    };
  }

  public patchPanel(patch: Partial<PanelConfig>): void {
    this.config = {
      ...this.config,
      panel: { ...this.config.panel, ...patch },
    };
  }

  public patchEmojis(categoryEmojis: Record<string, string>, buttonEmojis: Record<string, string>): void {
    const pick = (configValue: string, autoValue: string | undefined) => configValue || autoValue || '';

    const mergedCategories: Record<string, string> = { ...categoryEmojis };
    for (const [key, value] of Object.entries(this.config.emojis.categories)) {
      if (value) mergedCategories[key] = value;
    }

    this.config = {
      ...this.config,
      emojis: {
        ...this.config.emojis,
        categories: mergedCategories,
      },
      ticket: {
        ...this.config.ticket,
        controls: {
          close: { ...this.config.ticket.controls.close, emojiId: pick(this.config.ticket.controls.close.emojiId, buttonEmojis.close) },
          add: { ...this.config.ticket.controls.add, emojiId: pick(this.config.ticket.controls.add.emojiId, buttonEmojis.add) },
          remove: { ...this.config.ticket.controls.remove, emojiId: pick(this.config.ticket.controls.remove.emojiId, buttonEmojis.remove) },
          claim: { ...this.config.ticket.controls.claim, emojiId: pick(this.config.ticket.controls.claim.emojiId, buttonEmojis.claim) },
          pin: { ...this.config.ticket.controls.pin, emojiId: pick(this.config.ticket.controls.pin.emojiId, buttonEmojis.pin) },
          stats: { ...this.config.ticket.controls.stats, emojiId: pick(this.config.ticket.controls.stats.emojiId, buttonEmojis.stats) },
        },
      },
    };
  }
}
