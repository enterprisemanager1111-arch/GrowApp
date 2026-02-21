const express = require("express");
const bodyParser = require("body-parser");
const { stripe } = require("./stripe"); // your CommonJS stripe.js
const { db } = require("./db");
const { createDiscordInvite } = require("./discord"); // CommonJS version

const router = express.Router();

// Stripe requires raw body for webhook verification
router.post("/", bodyParser.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    try {
        // Verify webhook signature
        const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);

        if (event.type === "checkout.session.completed") {
            const session = event.data.object;

            // Check if user already ACTIVE (prevents double activation)
            const { rows } = await db.query(
                `SELECT server_status FROM community_members WHERE stripe_session_id = $1`,
                [session.id]
            );

            if (rows[0] && rows[0].server_status === "ACTIVE") {
                console.log(`✅ Session ${session.id} already processed`);
                return res.status(200).send("Already processed");
            }

            // Create one-time Discord invite
            const discordInvite = await createDiscordInvite(
                process.env.DISCORD_GUILD_ID,
                process.env.DISCORD_CHANNEL_ID
            );

            // Update DB: set server_status = ACTIVE and save Discord invite code
            await db.query(
                `UPDATE community_members
         SET discord_invite = $1, server_status = 'ACTIVE'
         WHERE stripe_session_id = $2`,
                [discordInvite, session.id]
            );

            console.log(`✅ Payment processed, Discord invite created: ${discordInvite}`);
        }

        res.status(200).send("Webhook received");
    } catch (err) {
        console.error("⚠️ Webhook error:", err);
        res.status(500).send("⚠️ An error occurred. Please contact WeAreOneWithNature@proton.me");
    }
});

module.exports = router;
