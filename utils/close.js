module.exports = {
  async close(interaction, client, reason) {
    const ticket = await client.db.get(`tickets_${interaction.channel.id}`);
    if (!ticket) return interaction.reply({ content: 'Ticket not found', ephemeral: true }).catch(e => console.log(e));

    if (
      client.config.whoCanCloseTicket === 'STAFFONLY' &&
      !interaction.member.roles.cache.some(r => client.config.rolesWhoHaveAccessToTheTickets.includes(r.id))
    ) {
      return interaction.reply({
        content: client.locales.ticketOnlyClosableByStaff,
        ephemeral: true
      }).catch(e => console.log(e));
    }

    if (ticket.closed) {
      return interaction.reply({
        content: client.locales.ticketAlreadyClosed,
        ephemeral: true
      }).catch(e => console.log(e));
    }

    const closeReason = reason || client.locales.other.noReasonGiven;
    client.log("ticketClose", {
      user: {
        tag: interaction.user.tag,
        id: interaction.user.id,
        avatarURL: interaction.user.displayAvatarURL()
      },
      ticketId: ticket.id,
      ticketChannelId: interaction.channel.id,
      ticketCreatedAt: ticket.createdAt,
      reason: closeReason
    }, client);

    await client.db.set(`tickets_${interaction.channel.id}.closed`, true);
    await client.db.set(`tickets_${interaction.channel.id}.closedBy`, interaction.user.id);
    await client.db.set(`tickets_${interaction.channel.id}.closedAt`, Date.now());
    await client.db.set(`tickets_${interaction.channel.id}.closeReason`, closeReason);

    const creator = await client.db.get(`tickets_${interaction.channel.id}.creator`);
    const invited = await client.db.get(`tickets_${interaction.channel.id}.invited`) || [];

    interaction.channel.permissionOverwrites.edit(creator, {
      ViewChannel: false
    }).catch(e => console.log(e));

    invited.forEach(user => {
      interaction.channel.permissionOverwrites.edit(user, {
        ViewChannel: false
      }).catch(e => console.log(e));
    });

    await interaction.channel.messages.fetch().catch(e => console.log(e));
    const messageId = await client.db.get(`tickets_${interaction.channel.id}.messageId`);
    const msg = interaction.channel.messages.cache.get(messageId);

    if (msg) {
      const embed = msg.embeds[0]?.data;
      const components = msg.components || [];
      components.forEach(row => {
        row.components.forEach(component => {
          if (component.data.custom_id === 'close' || component.data.custom_id === 'close_askReason') {
            component.data.disabled = true;
          }
        });
      });

      msg.edit({
        content: msg.content,
        ...(embed ? { embeds: [embed] } : {}),
        components
      }).catch(e => console.log(e));
    }

    const closedEmbed = JSON.parse(JSON.stringify(client.locales.embeds.ticketClosed)
      .replace('TICKETCOUNT', ticket.id)
      .replace('REASON', closeReason.replace(/[\n\r]/g, '\\n'))
      .replace('CLOSERNAME', interaction.user.tag));

    const row = new client.discord.ActionRowBuilder().addComponents(
      new client.discord.ButtonBuilder()
        .setCustomId('deleteTicket')
        .setLabel(client.locales.other.deleteTicketButtonMSG)
        .setStyle(client.discord.ButtonStyle.Danger)
    );

    await interaction.reply({
      content: 'The ticket has been closed.',
      ephemeral: true
    }).catch(e => console.log(e));

    interaction.channel.send({
      embeds: [closedEmbed],
      components: [row]
    }).catch(e => console.log(e));
  }
};