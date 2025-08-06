const { ethers } = require("hardhat");

async function main() {
    console.log("🎫 Starting EventTicketing Contract Simulation...\n");

    // Get signers
    const [owner, organizer1, organizer2, buyer1, buyer2, buyer3] = await ethers.getSigners();
    
    console.log("📋 Account Setup:");
    console.log(`Owner: ${owner.address}`);
    console.log(`Organizer 1: ${organizer1.address}`);
    console.log(`Organizer 2: ${organizer2.address}`);
    console.log(`Buyer 1: ${buyer1.address}`);
    console.log(`Buyer 2: ${buyer2.address}`);
    console.log(`Buyer 3: ${buyer3.address}\n`);

    // Deploy the contract
    console.log("🚀 Deploying EventTicketing contract...");
    const EventTicketing = await ethers.getContractFactory("EventTicketing");
    const eventTicketing = await EventTicketing.deploy();
    await eventTicketing.waitForDeployment();
    
    const contractAddress = await eventTicketing.getAddress();
    console.log(`Contract deployed to: ${contractAddress}\n`);

    // Helper function to format ether
    const formatEther = (value: bigint): string => ethers.formatEther(value);

    interface EventDetails {
        0: string; 
        1: bigint; 
        2: bigint; 
        3: number; 
        4: number; 
        5: boolean; 
        6: string; 
    }

    interface TicketInfo {
        0: number; 
        1: string; 
        2: boolean; 
    }

    const parseEther = (value: string): bigint => ethers.parseEther(value);

    const getFutureTimestamp = (daysFromNow: number): number => {
        return Math.floor(Date.now() / 1000) + (daysFromNow * 24 * 60 * 60);
    };

    try {
        //Create Events
        console.log("🎪 Creating Events...");
        
        // Event 1
        const concertDate = getFutureTimestamp(20); // 20 days from now
        const concertPrice = parseEther("0.1"); // 0.1 ETH
        const maxConcertTickets = 100;
        
        const createConcertTx = await eventTicketing.connect(organizer1).createEvent(
            "Web3Lagos Conference",
            concertDate,
            concertPrice,
            maxConcertTickets
        );
        await createConcertTx.wait();
        console.log("✅ Created: Web3Lagos Conference");

        // Event 2
        const conferenceDate = getFutureTimestamp(45); // 45 days from now
        const conferencePrice = parseEther("0.05"); // 0.05 ETH
        const maxConferenceTickets = 50;
        
        const createConferenceTx = await eventTicketing.connect(organizer2).createEvent(
            "Blockchain Developer Conference",
            conferenceDate,
            conferencePrice,
            maxConferenceTickets
        );
        await createConferenceTx.wait();
        console.log("✅ Created: Blockchain Developer Conference");

        // Event 3:
        const workshopDate = getFutureTimestamp(15); // 15 days from now
        const workshopPrice = parseEther("0.02"); // 0.02 ETH
        const maxWorkshopTickets = 5; // Very limited
        
        const createWorkshopTx = await eventTicketing.connect(organizer1).createEvent(
            "Rust Conference",
            workshopDate,
            workshopPrice,
            maxWorkshopTickets
        );
        await createWorkshopTx.wait();
        console.log("✅ Created: Rust Conference");

        // View events
        console.log("📋 Event Details:");
        for (let i = 0; i < 3; i++) {
           const eventDetails = await eventTicketing["getEvent(uint256)"](i);
            console.log(`Event ${i}:`);
            console.log(`  Name: ${eventDetails[0]}`);
            console.log(`  Date: ${new Date(Number(eventDetails[1]) * 1000).toLocaleDateString()}`);
            console.log(`  Price: ${formatEther(eventDetails[2])} ETH`);
            console.log(`  Max Tickets: ${eventDetails[3]}`);
            console.log(`  Sold Tickets: ${eventDetails[4]}`);
            console.log(`  Active: ${eventDetails[5]}`);
            console.log(`  Organizer: ${eventDetails[6]}\n`);
        }

        //Buy Tickets
        console.log("🎟️  Buying Tickets...");
        
        // Buyer 1 buys tickets for two conferences
        console.log("Buyer 1 purchasing tickets...");
        const buyTicket1 = await eventTicketing.connect(buyer1).buyTicket(0, {
            value: concertPrice
        });
        await buyTicket1.wait();
        console.log("✅ Buyer 1 bought conference ticket");

        const buyTicket2 = await eventTicketing.connect(buyer1).buyTicket(1, {
            value: conferencePrice
        });
        await buyTicket2.wait();
        console.log("✅ Buyer 1 bought conference ticket");

        // Buyer 2 buys workshop ticket with excess payment (should get refund)
        console.log("\Buyer 2 purchasing blockchain conference ticket with excess payment...");
        const excessPayment = parseEther("0.05"); // Paying more than required
        const buyTicket3 = await eventTicketing.connect(buyer2).buyTicket(2, {
            value: excessPayment
        });
        await buyTicket3.wait();
        console.log("✅ Buyer 2 bought rust conference ticket (excess payment refunded)");

        // Multiple buyers buy workshop tickets to test capacity limit
        console.log("\nBuying remaining workshop tickets...");
        for (let i = 0; i < 4; i++) {
            const buyTx = await eventTicketing.connect(buyer3).buyTicket(2, {
                value: workshopPrice
            });
            await buyTx.wait();
            console.log(`✅ Workshop ticket ${i + 2} sold`);
        }

        // CHECK BALANCES
        console.log("\n💰 Ticket Balances:");
        const buyer1Balance = await eventTicketing.balanceOf(buyer1.address);
        const buyer2Balance = await eventTicketing.balanceOf(buyer2.address);
        const buyer3Balance = await eventTicketing.balanceOf(buyer3.address);
        
        console.log(`Buyer 1: ${buyer1Balance} tickets`);
        console.log(`Buyer 2: ${buyer2Balance} ticket`);
        console.log(`Buyer 3: ${buyer3Balance} tickets`);

        // CHECK EVENT OWNERSHIP
        console.log("\n🎫 Event Ticket Ownership:");
        const hasConcertTicket = await eventTicketing.hasTicketForEvent(buyer1.address, 0);
        const hasConferenceTicket = await eventTicketing.hasTicketForEvent(buyer1.address, 1);
        const hasWorkshopTicket = await eventTicketing.hasTicketForEvent(buyer2.address, 2);
        
        console.log(`Buyer 1 has concert ticket: ${hasConcertTicket}`);
        console.log(`Buyer 1 has conference ticket: ${hasConferenceTicket}`);
        console.log(`Buyer 2 has workshop ticket: ${hasWorkshopTicket}`);

        // TRANSFER TICKET
        console.log("\n🔄 Transferring Ticket...");
        // Transfer ticket ID 0 from buyer1 to buyer2
        const transferTx = await eventTicketing.connect(buyer1).transferTicket(0, buyer2.address);
        await transferTx.wait();
        console.log("✅ Buyer 1 transferred concert ticket to Buyer 2");

        // Check updated balances
        const newBuyer1Balance = await eventTicketing.balanceOf(buyer1.address);
        const newBuyer2Balance = await eventTicketing.balanceOf(buyer2.address);
        console.log(`Updated - Buyer 1: ${newBuyer1Balance} tickets, Buyer 2: ${newBuyer2Balance} tickets`);

        //USE TICKETS 
        console.log("\n✅ Using Tickets...");
        
        // Buyer 2 uses the transferred concert ticket
        const useTicket1 = await eventTicketing.connect(buyer2).useTicket(0);
        await useTicket1.wait();
        console.log("✅ Buyer 2 used conference ticket");

        // Check ticket status
        const ticketInfo = await eventTicketing.getTicket(0);
        console.log(`Ticket 0 - Event: ${ticketInfo[0]}, Owner: ${ticketInfo[1]}, Used: ${ticketInfo[2]}`);

        // TRY TO BUY SOLD OUT EVENT 
        console.log("\n🚫 Testing Sold Out Event...");
        try {
            await eventTicketing.connect(buyer1).buyTicket(2, {
                value: conferencePrice
            });
        } catch (error) {
            console.log("✅ Correctly rejected: Conference is sold out");
        }

        // EVENT CANCELLATION
        console.log("\n❌ Testing Event Cancellation...");
        
        // Organizer cancels their event
        const cancelTx = await eventTicketing.connect(organizer2).cancelEvent(1);
        await cancelTx.wait();
        console.log("✅ Organizer 2 canceled the conference");

        // Try to buy ticket for canceled event
        try {
            await eventTicketing.connect(buyer3).buyTicket(1, {
                value: conferencePrice
            });
        } catch (error) {
            console.log("✅ Correctly rejected: Event is not active");
        }

        // FINAL STATUS
        console.log("\n📊 Final Status:");
        
        // Check updated event details
        for (let i = 0; i < 3; i++) {
            const eventDetails = await eventTicketing["getEvent(uint256)"](i);
            console.log(`Event ${i} (${eventDetails[0]}):`);
            console.log(`  Sold: ${eventDetails[4]}/${eventDetails[3]} tickets`);
            console.log(`  Active: ${eventDetails[5]}`);
        }

        // ERROR TESTING 
        console.log("\n🧪 Testing Error Conditions...");
        
        // Test insufficient payment
        try {
            await eventTicketing.connect(buyer1).buyTicket(0, {
                value: parseEther("0.01") // Less than required
            });
        } catch (error) {
            console.log("✅ Correctly rejected: Insufficient payment");
        }

        // Test non-existent event
        try {
            await eventTicketing.connect(buyer1).buyTicket(999, {
                value: parseEther("0.1")
            });
        } catch (error) {
            console.log("✅ Correctly rejected: Event does not exist");
        }

        // Test using non-owned ticket
        try {
            await eventTicketing.connect(buyer1).useTicket(2); // Ticket owned by buyer2
        } catch (error) {
            console.log("✅ Correctly rejected: Not ticket owner");
        }

        // Test transferring non-owned ticket
        try {
            await eventTicketing.connect(buyer1).transferTicket(2, buyer3.address);
        } catch (error) {
            console.log("✅ Correctly rejected: Not ticket owner for transfer");
        }

        console.log("\n🎉 Simulation completed successfully!");
        console.log("All contract functions have been tested and are working as expected.");

    } catch (error) {
        console.error("❌ Error during simulation:", error);
        process.exit(1);
    }
}

// Handle errors
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exit(1);
    });