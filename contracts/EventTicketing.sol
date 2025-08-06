// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Custom Errors
error NotOwner();
error EventDoesNotExist();
error EventNotActive();
error EventSoldOut();
error InsufficientPayment();
error TicketDoesNotExist();
error NotTicketOwner();

contract EventTicketing {
    
    address public owner;
    uint256 private _tokenCounter;
    uint256 public eventCounter;
    
    struct Event {
        string name;
        uint256 eventDate;
        uint256 ticketPrice;
        uint256 maxTickets;
        uint256 soldTickets;
        bool isActive;
        address organizer;
    }
    
    struct Ticket {
        uint256 eventId;
        address owner;
        bool isUsed;
    }
    
    mapping(uint256 => Event) public events;
    mapping(uint256 => Ticket) public tickets;
    mapping(address => uint256) public balanceOf;
    
    event EventCreated(uint256 indexed eventId, string name, address organizer);
    event TicketMinted(uint256 indexed ticketId, uint256 indexed eventId, address buyer);
    event TicketUsed(uint256 indexed ticketId);
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier eventExists(uint256 eventId) {
        if (eventId >= eventCounter) revert EventDoesNotExist();
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    // Create a new event
    function createEvent(
        string memory _name,
        uint256 _eventDate,
        uint256 _ticketPrice,
        uint256 _maxTickets
    ) external returns (uint256) {
        uint256 eventId = eventCounter;
        
        events[eventId] = Event({
            name: _name,
            eventDate: _eventDate,
            ticketPrice: _ticketPrice,
            maxTickets: _maxTickets,
            soldTickets: 0,
            isActive: true,
            organizer: msg.sender
        });
        
        eventCounter++;
        
        emit EventCreated(eventId, _name, msg.sender);
        return eventId;
    }
    
    // Buy a ticket for an event
    function buyTicket(uint256 eventId) external payable eventExists(eventId) {
        Event storage event_ = events[eventId];
        
        if (!event_.isActive) revert EventNotActive();
        if (event_.soldTickets >= event_.maxTickets) revert EventSoldOut();
        if (msg.value < event_.ticketPrice) revert InsufficientPayment();
        
        uint256 ticketId = _tokenCounter;
        _tokenCounter++;
        
        tickets[ticketId] = Ticket({
            eventId: eventId,
            owner: msg.sender,
            isUsed: false
        });
        
        balanceOf[msg.sender]++;
        event_.soldTickets++;
        
        // Send payment to event organizer
        payable(event_.organizer).transfer(event_.ticketPrice);
        
        // Refund excess payment
        if (msg.value > event_.ticketPrice) {
            payable(msg.sender).transfer(msg.value - event_.ticketPrice);
        }
        
        emit TicketMinted(ticketId, eventId, msg.sender);
    }
    
    // Use/validate a ticket
    function useTicket(uint256 ticketId) external {
        if (ticketId >= _tokenCounter) revert TicketDoesNotExist();
        if (tickets[ticketId].owner != msg.sender) revert NotTicketOwner();
        
        tickets[ticketId].isUsed = true;
        
        emit TicketUsed(ticketId);
    }
    
    // Transfer ticket to another address
    function transferTicket(uint256 ticketId, address to) external {
        if (ticketId >= _tokenCounter) revert TicketDoesNotExist();
        if (tickets[ticketId].owner != msg.sender) revert NotTicketOwner();
        
        tickets[ticketId].owner = to;
        balanceOf[msg.sender]--;
        balanceOf[to]++;
    }
    
    // Get ticket information
    function getTicket(uint256 ticketId) external view returns (
        uint256 eventId,
        address ticketOwner,
        bool isUsed
    ) {
        if (ticketId >= _tokenCounter) revert TicketDoesNotExist();
        
        Ticket memory ticket = tickets[ticketId];
        return (ticket.eventId, ticket.owner, ticket.isUsed);
    }
    
    // Get event information
    function getEvent(uint256 eventId) external view eventExists(eventId) returns (
        string memory name,
        uint256 eventDate,
        uint256 ticketPrice,
        uint256 maxTickets,
        uint256 soldTickets,
        bool isActive,
        address organizer
    ) {
        Event memory event_ = events[eventId];
        return (
            event_.name,
            event_.eventDate,
            event_.ticketPrice,
            event_.maxTickets,
            event_.soldTickets,
            event_.isActive,
            event_.organizer
        );
    }
    
    // Check if address owns a ticket for specific event
    function hasTicketForEvent(address user, uint256 eventId) external view returns (bool) {
        for (uint256 i = 0; i < _tokenCounter; i++) {
            if (tickets[i].owner == user && tickets[i].eventId == eventId && !tickets[i].isUsed) {
                return true;
            }
        }
        return false;
    }
    
    // Cancel event (only organizer)
    function cancelEvent(uint256 eventId) external eventExists(eventId) {
        if (events[eventId].organizer != msg.sender && msg.sender != owner) revert NotOwner();
        events[eventId].isActive = false;
    }
}