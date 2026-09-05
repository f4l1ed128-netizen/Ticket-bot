  module.exports = {
    clientId: "1545619986901504100", // The id of the discord bot
    guildId: "1545620208935374931", // The id of the discord server
    mainColor: "ff0000", // The hex color of the embeds by default
    lang: "main", // If you want to set english please set "main"
    openTicketChannelId: "1545620209866637324", // The id of the channel where the message to create a ticket will be sent
    ticketTypes: [ // You have a limit of 25 types (the limit of Discord)
      {
        codeName: "category-one", // The name need to be in lowercase
        name: "تقديم على الأدارة", // The name that will be displayed in the ticket
        emoji: "", // The emoji of the type (can be blank)
        color: "ff0000", // Can be a hex color or blank to use the main color
        categoryId: "", // The category id where the tickets will be created
        customDescription: "تقديم على الادارة لسيرفر VIP E-Sports.\n\nReason: REASON", // The custom description of the ticket type (set to blank to use the default description)
        askReason: false // If the bot should ask the reason of the ticket
      }
    ],
    ticketNameOption: "Ticket-TICKETCOUNT", // Here is all parameter: USERNAME, USERID, TICKETCOUNT
    rolesWhoHaveAccessToTheTickets: [
      "1545628470501969990",
    ], // Roles who can access to the tickets
    pingRoleWhenOpened: false,
    roleToPingWhenOpenedId: "", // The role to ping when a ticket is opened
    logs: true,
    logsChannelId: "1542605161153957918", // The id of the channel where the logs will be sent
    claimButton: true,
    whoCanCloseTicket: "STAFFONLY", // STAFFONLY (roles configured at "rolesWhoHaveAccessToTheTickets") or EVERYONE
    closeButton: true, // If false the ticket can be closed only by doing /closes
    askReasonWhenClosing: true, // If false the ticket will be closed without asking the reason
    maxTicketOpened: 1 // The number of tickets the user can open while another one is already open. Set to 0 to unlimited
  };
