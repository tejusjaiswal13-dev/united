export const hardcodedPils = [
    {
        id: "demo-pil-001",
        pilId: "PIL-ENV-492",
        title: "Urgent Revitalization of Bellandur Lake Ecosystem",
        description: "Bellandur Lake in Bengaluru has been foaming and catching fire due to severe chemical dumping. This petition demands an immediate halt to industrial effluent discharge, establishment of working STPs, and a citizen-led monitoring committee to oversee the ecological restoration.",
        category: "Environment",
        location: { state: "Karnataka", city: "Bengaluru" },
        urgency: "Critical",
        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
        createdBy: "system",
        creatorName: "Environment Action Group",
        supporters: 15420,
        status: "Admitted"
    },
    {
        id: "demo-pil-002",
        pilId: "PIL-CIV-819",
        title: "Implementation of Safe Pedestrian Crossings on Mumbai Western Express Highway",
        description: "The Western Express Highway has become a death trap for pedestrians due to lack of skywalks and functional traffic signals at crucial junctions. We seek a court directive to the MMRDA to immediately construct at least 5 pedestrian bridges at identified blackspots.",
        category: "Civic Infrastructure",
        location: { state: "Maharashtra", city: "Mumbai" },
        urgency: "High",
        createdAt: { seconds: Date.now() / 1000 - 86400 * 5, nanoseconds: 0 },
        createdBy: "system",
        creatorName: "Citizens for Safe Roads",
        supporters: 8250,
        status: "Under Review"
    },
    {
        id: "demo-pil-003",
        pilId: "PIL-SAF-102",
        title: "Regulating Groundwater Extraction in Marathwada",
        description: "Unregulated borewells by commercial water tanker mafias have severely depleted the water table in drought-prone Marathwada villages. This PIL requests a ban on commercial borewells deeper than 200 feet and mandatory rainwater harvesting.",
        category: "Public Safety",
        location: { state: "Maharashtra", city: "Latur" },
        urgency: "Medium",
        createdAt: { seconds: Date.now() / 1000 - 86400 * 15, nanoseconds: 0 },
        createdBy: "system",
        creatorName: "Kisan Sangharsh Samiti",
        supporters: 4100,
        status: "Filed"
    }
];
