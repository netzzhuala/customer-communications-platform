const ami = require('./instance');
const Call = require('../models/call');
const { verifyConsent, incrementContactCount } = require('../utils/consentManager');

async function makeCall(phoneNumber, agent) {
    try {
        // Verify consent exists BEFORE making the call
        const hasConsent = await verifyConsent(phoneNumber);
        
        if (!hasConsent) {
            console.log(`No consent found for ${phoneNumber}. Call not initiated.`);
            return { success: false, reason: 'No consent on record' };
        }
        
        // Check if number is on DNC
        const contact = await Call.findOne({ phoneNumber, dnc: true });
        if (contact) {
            console.log(`${phoneNumber} is on DNC list. Call not initiated.`);
            return { success: false, reason: 'Number on DNC list' };
        }
        
        // Check contact frequency
        const canContact = await incrementContactCount(phoneNumber);
        if (!canContact) {
            console.log(`Contact frequency limit reached for ${phoneNumber}. Call not initiated.`);
            return { success: false, reason: 'Contact frequency limit reached' };
        }
        
        // Initiate call only after all checks pass
        const callResult = await ami.action('Originate', {
            Channel: `Local/${phoneNumber}@outgoing`,
            Application: 'Playback',
            Data: 'sounds/tech_services_intro.wav',
            CallerID: 'Customer Service',
            Async: 'true'
        });
        
        if (callResult.response === 'Success') {
            // Update agent assignment
            await Call.findOneAndUpdate(
                { phoneNumber },
                { agent, lastContacted: new Date() }
            );
            
            return { success: true, callId: callResult.uniqueid };
        } else {
            return { success: false, reason: callResult.message };
        }
    } catch (error) {
        console.error('Error making call:', error);
        return { success: false, reason: error.message };
    }
}

module.exports = { makeCall };
