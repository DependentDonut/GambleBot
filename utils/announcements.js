const fs = require("fs");
const path = require("path");


const filePath = path.join(
    process.cwd(),
    "data",
    "announcements.json"
);


// --------------------
// LOAD SETTINGS
// --------------------

function loadAnnouncements() {
    const data =
        fs.readFileSync(
            filePath,
            "utf8"
        ).trim();

    if (!data) {
        return {};
    }

    return JSON.parse(data);
}


// --------------------
// SAVE SETTINGS
// --------------------

function saveAnnouncements(data) {
    fs.writeFileSync(
        filePath,
        JSON.stringify(
            data,
            null,
            4
        )
    );
}


// --------------------
// SET CHANNEL
// --------------------

function setAnnouncementChannel(
    guildId,
    channelId
) {
    const data =
        loadAnnouncements();

    data[guildId] = {
        channelId: channelId
    };

    saveAnnouncements(data);

    return channelId;
}


// --------------------
// GET CHANNEL
// --------------------

function getAnnouncementChannel(
    guildId
) {
    const data =
        loadAnnouncements();

    if (!data[guildId]) {
        return null;
    }

    return data[guildId].channelId;
}


// --------------------
// DISABLE
// --------------------

function disableAnnouncements(
    guildId
) {
    const data =
        loadAnnouncements();

    delete data[guildId];

    saveAnnouncements(data);
}


// --------------------
// SEND ANNOUNCEMENT
// --------------------

async function sendAnnouncement(
    client,
    guildId,
    message
) {
    const channelId =
        getAnnouncementChannel(
            guildId
        );

    if (!channelId) {
        return false;
    }


    try {

        const channel =
            await client.channels.fetch(
                channelId
            );


        if (
            !channel ||
            !channel.isTextBased()
        ) {
            return false;
        }


        await channel.send(message);

        return true;
    }

    catch (error) {

        console.error(
            "Announcement error:",
            error
        );

        return false;
    }
}


// --------------------
// EXPORTS
// --------------------

module.exports = {
    setAnnouncementChannel,
    getAnnouncementChannel,
    disableAnnouncements,
    sendAnnouncement
};