const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    async function createTicket(ticketType, reason) {
      const ticketName = client.config.ticketNameOption
        .replace('USERNAME', interaction.user.username)
        .replace('USERID', interaction.user.id)
        .replace('TICKETCOUNT', await client.db.get(`temp.ticketCount`) || 0);

      const channelOptions = {
        name: ticketName,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone,
            deny: [PermissionFlagsBits.ViewChannel]
          }
        ]
      };

      if (/^\d{17,20}$/.test(ticketType.categoryId)) {
        channelOptions.parent = ticketType.categoryId;
      }

      client.guilds.cache.get(client.config.guildId).channels.create(channelOptions).then(async channel => {
        client.log("ticketCreate", {
          user: {
            tag: interaction.user.tag,
            id: interaction.user.id,
            avatarURL: interaction.user.displayAvatarURL()
          },
          reason: reason,
          ticketChannelId: channel.id
        }, client);

        await client.db.add(`temp.ticketCount`, 1);
        const ticketId = await client.db.get(`temp.ticketCount`);
        await client.db.set(`tickets_${channel.id}`, {
          id: ticketId - 1,
          category: ticketType,
          reason: reason,
          creator: interaction.user.id,
          invited: [],
          createdAt: Date.now(),
          closed: false,
          closedBy: null,
          closedAt: null
        });

        channel.permissionOverwrites.edit(interaction.user, {
          SendMessages: true,
          AddReactions: true,
          ReadMessageHistory: true,
          AttachFiles: true,
          ViewChannel: true
        }).catch(e => console.log(e));

        if (client.config.rolesWhoHaveAccessToTheTickets.length > 0) {
          client.config.rolesWhoHaveAccessToTheTickets.forEach(async role => {
            channel.permissionOverwrites.edit(role, {
              SendMessages: true,
              AddReactions: true,
              ReadMessageHistory: true,
              AttachFiles: true,
              ViewChannel: true
            }).catch(e => console.log(e));
          });
        }

        const ticketOpenedEmbed = new client.discord.EmbedBuilder()
          .setColor(ticketType.color ? ticketType.color : client.config.mainColor)
          .setTitle(client.embeds.ticketOpened.title.replace('CATEGORYNAME', ticketType.name))
          .setDescription(
            ticketType.customDescription ? ticketType.customDescription
              .replace('CATEGORYNAME', ticketType.name)
              .replace('REASON', reason) :
              client.embeds.ticketOpened.description
                .replace('CATEGORYNAME', ticketType.name)
                .replace('REASON', reason))
          .setFooter({
            text: "is.gd/ticketbot" + client.embeds.ticketOpened.footer.text.replace("is.gd/ticketbot", ""),
            iconUrl: client.embeds.ticketOpened.footer.iconUrl
          })
          .setThumbnail("https://cdn.discordapp.com/icons/1284771079998668873/a0adcfcc191ca60b929a5c00bef34b13.webp?size=480");

        const row = new client.discord.ActionRowBuilder();

        if (client.config.closeButton) {
          if (client.config.askReasonWhenClosing) {
            row.addComponents(
              new client.discord.ButtonBuilder()
                .setCustomId('close_askReason')
                .setLabel(client.locales.buttons.close.label)
                .setEmoji(client.locales.buttons.close.emoji)
                .setStyle(client.discord.ButtonStyle.Danger)
            );
          } else {
            row.addComponents(
              new client.discord.ButtonBuilder()
                .setCustomId('close')
                .setLabel(client.locales.buttons.close.label)
                .setEmoji(client.locales.buttons.close.emoji)
                .setStyle(client.discord.ButtonStyle.Danger)
            );
          }
        }

        const body = {
          embeds: [ticketOpenedEmbed],
          content: `<@${interaction.user.id}> ${client.config.pingRoleWhenOpened ? `<@&${client.config.roleToPingWhenOpenedId}>` : ''}`
        };

        if (row.components.length > 0) body.components = [row];

        channel.send(body).then((msg) => {
          client.db.set(`tickets_${channel.id}.messageId`, msg.id);
          msg.pin().then(() => {
            msg.channel.bulkDelete(1);
          });
          const response = {
            content: client.locales.ticketOpenedMessage.replace('TICKETCHANNEL', `<#${channel.id}>`),
            components: []
          };
          const responsePromise = interaction.deferred || interaction.replied
            ? interaction.editReply(response)
            : interaction.update({ ...response, ephemeral: true });
          responsePromise.catch(e => console.log(e));
        }).catch(e => console.log(e));
      }).catch(async e => {
        console.error("Unable to create ticket channel:", e);
        const response = {
          content: "Something went wrong while creating your ticket. Please contact a staff member.",
          components: []
        };
        const responsePromise = interaction.deferred || interaction.replied
          ? interaction.editReply(response)
          : interaction.reply({ ...response, ephemeral: true });
        responsePromise.catch(error => console.log(error));
      });
    }

    if (interaction.isButton()) {
      if (interaction.customId === "openTicket") {
        const all = (await client.db.all()).filter(data => data.id.startsWith("tickets_"));
        const ticketsOpened = all.filter(data => data.value.creator === interaction.user.id && data.value.closed === false).length;

        if (client.config.maxTicketOpened !== 0) {
          if (ticketsOpened >= client.config.maxTicketOpened) {
            return interaction.reply({
              content: client.locales.ticketLimitReached.replace("TICKETLIMIT", client.config.maxTicketOpened),
              ephemeral: true
            }).catch(e => console.log(e));
          }
        }

        const row = new client.discord.ActionRowBuilder()
          .addComponents(
            new client.discord.SelectMenuBuilder()
              .setCustomId('selectTicketType')
              .setPlaceholder(client.locales.other.selectTicketTypePlaceholder)
              .setMaxValues(1)
              .addOptions(
                client.config.ticketTypes.map(x => {
                  const options = new client.discord.SelectMenuOptionBuilder()
                    .setLabel(x.name)
                    .setValue(x.codeName);
                  if (x.emoji) options.setEmoji(x.emoji);
                  return options;
                })
              )
          );

        interaction.reply({
          ephemeral: true,
          components: [row]
        }).catch(e => console.log(e));
      }

      if (interaction.customId === "close") {
        const { close } = require('../utils/close.js');
        close(interaction, client, client.locales.other.noReasonGiven);
      }

      if (interaction.customId === "close_askReason") {
        const { closeAskReason } = require('../utils/close_askReason.js');
        closeAskReason(interaction, client);
      }

      if (interaction.customId === "deleteTicket") {
        const { deleteTicket } = require("../utils/delete.js");
        deleteTicket(interaction, client);
      }
    }

    if (interaction.isSelectMenu()) {
      if (interaction.customId === "selectTicketType") {
        const ticketType = client.config.ticketTypes.find(x => x.codeName === interaction.values[0]);
        if (!ticketType) return console.error(`Ticket type ${interaction.values[0]} not found!`);

        if (ticketType.askReason) {
          const modal = new client.discord.ModalBuilder()
            .setCustomId('askReason')
            .setTitle(client.locales.modals.reasonTicketOpen.title);

          const input = new client.discord.TextInputBuilder()
            .setCustomId('input_' + interaction.values[0])
            .setLabel(client.locales.modals.reasonTicketOpen.label)
            .setStyle(client.discord.TextInputStyle.Paragraph)
            .setPlaceholder(client.locales.modals.reasonTicketOpen.placeholder)
            .setMaxLength(256);

          const firstActionRow = new client.discord.ActionRowBuilder().addComponents(input);
          modal.addComponents(firstActionRow);
          await interaction.showModal(modal).catch(e => console.log(e));
        } else {
          createTicket(ticketType, "No reason provided");
        }
      }

      if (interaction.customId === "removeUser") {
        const ticket = await client.db.get(`tickets_${interaction.message.channelId}`);
        client.db.pull(`tickets_${interaction.message.channel.id}.invited`, interaction.values);

        interaction.values.forEach(value => {
          interaction.channel.permissionOverwrites.delete(value).catch(e => console.log(e));

          client.log("userRemoved", {
            user: {
              tag: interaction.user.tag,
              id: interaction.user.id,
              avatarURL: interaction.user.displayAvatarURL()
            },
            ticketId: ticket.id,
            ticketChannelId: interaction.channel.id,
            removed: {
              id: value
            }
          }, client);
        });

        interaction.update({
          content: `> Removed ${interaction.values.length < 1 ? interaction.values : interaction.values.map(a => `<@${a}>`).join(', ')} from the ticket`,
          components: []
        }).catch(e => console.log(e));
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === "askReason") {
        await interaction.deferReply({ ephemeral: true });
        const type = interaction.fields.fields.first().customId.split('_')[1];
        const ticketType = client.config.ticketTypes.find(x => x.codeName === type);
        if (!ticketType) return console.error(`Ticket type ${type} not found!`);
        createTicket(ticketType, interaction.fields.fields.first().value);
      }

      if (interaction.customId === "askReasonClose") {
        const { close } = require('../utils/close.js');
        close(interaction, client, interaction.fields.fields.first().value);
      }
    }
  }
};
