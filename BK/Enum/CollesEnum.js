(async function () {
    const BATCH_SIZE = 50;
    const START = 17001;
    const END = 17100;

    // Function to perform initial search and get session data
    const performInitialSearch = async (shipmentNumber) => {
        try {
            // First perform the search
            const searchResponse = await fetch("https://collessyoung.portal.expedock.com/beholder-api/graphql", {
                "headers": {
                    "accept": "*/*",
                    "accept-language": "en-AU,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
                    "content-type": "application/json",
                    "sec-ch-ua": "\"Not-A.Brand\";v=\"99\", \"Chromium\";v=\"124\"",
                    "sec-ch-ua-mobile": "?1",
                    "sec-ch-ua-platform": "\"Android\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "x-xpdsourceapp": "dashboard"
                },
                "referrer": "https://collessyoung.portal.expedock.com/search-shipments",
                "referrerPolicy": "strict-origin-when-cross-origin",
                "body": JSON.stringify({
                    "operationName": "searchShipments",
                    "variables": {
                        "slug": "collessyoung",
                        "query": shipmentNumber,
                        "page": 1,
                        "pageSize": 10
                    },
                    "query": `
                        query searchShipments($slug: String!, $query: String!, $page: Int!, $pageSize: Int!) {
                            searchShipments(slug: $slug, query: $query, page: $page, pageSize: $pageSize) {
                                edges {
                                    node {
                                        companyShipmentKey
                                        forwarderReference
                                        houseBill
                                        carrierBookingNumber
                                        consolNumber
                                        shipmentOrigin
                                        shipmentDestination
                                        shipmentEtd
                                        shipmentEta
                                        shipmentAtd
                                        shipmentAta
                                        milestone
                                        containers {
                                            edges {
                                                node {
                                                    containerNumber
                                                    __typename
                                                }
                                                __typename
                                            }
                                            __typename
                                        }
                                        __typename
                                    }
                                    __typename
                                }
                                pageInfo {
                                    hasNextPage
                                    hasPreviousPage
                                    startCursor
                                    endCursor
                                    __typename
                                }
                                totalCount
                                __typename
                            }
                        }
                    `
                }),
                "method": "POST",
                "mode": "cors",
                "credentials": "include"
            });

            const searchData = await searchResponse.json();
            const validHeaders = Object.fromEntries(searchResponse.headers);
            
            console.log("Search response:", searchData);
            console.log("Valid headers obtained:", validHeaders);

            return {
                headers: validHeaders,
                searchResults: searchData
            };
        } catch (error) {
            console.error("Error in initial search:", error);
            throw error;
        }
    };

    // Modified fetch function that uses the search response data
    const fetchShipmentDetails = async (shipmentNumber, sessionData) => {
        try {
            const response = await fetch("https://collessyoung.portal.expedock.com/beholder-api/graphql", {
                "headers": {
                    ...sessionData.headers,
                    "content-type": "application/json"
                },
                "referrer": `https://collessyoung.portal.expedock.com/details/${shipmentNumber}%20(CY6PRD)?newBreadcrumb=%7B%22name%22%3A%22Search+Shipments%22%2C%22link%22%3A%22%2Fsearch-shipments%3Fquery%3D${shipmentNumber}%22%7D&query=${shipmentNumber}`,
                "referrerPolicy": "strict-origin-when-cross-origin",
                "body": JSON.stringify({
                    "operationName": "shipperFacingShipmentDetails",
                    "variables": {
                        "slug": "collessyoung",
                        "companyShipmentKey": `${shipmentNumber} (CY6PRD)`
                    },
                    "query": "query shipperFacingShipmentDetails($slug: String!, $companyShipmentKey: String!) {\n  shipperFacingShipmentDetails(\n    slug: $slug\n    companyShipmentKey: $companyShipmentKey\n  ) {\n    snowflakeId\n    tmsId\n    apiPartnerId\n    module\n    companyName\n    forwarderReference\n    houseBill\n    carrierBookingNumber\n    consolNumber\n    companyShipmentKey\n    orderRefs\n    shipmentAta\n    shipmentEta\n    originPortAtd\n    originPortEtd\n    originPortAta\n    originPortEta\n    dischargePortAta\n    dischargePortEta\n    dischargePortAtd\n    dischargePortEtd\n    shipmentAtd\n    shipmentEtd\n    shipmentDestination\n    shipmentOrigin\n    milestone\n    snowflakeDateCreated\n    cauldronDateCreated\n    dateShipmentCreated\n    dateShipmentClosed\n    weight\n    volume\n    teus\n    incoterm\n    transportMode\n    containerMode\n    consigneeName\n    consigneeCode\n    consigneeAddress1\n    consigneeAddress2\n    consigneeCity\n    consigneeCountry\n    consigneeState\n    direction\n    pickupFromName\n    pickupFromCity\n    pickupFromCountry\n    pickupFromState\n    pickupFromUnlocode\n    pickupFromAddress1\n    pickupFromAddress2\n    pickupActualDate\n    pickupEstimatedDate\n    deliveryToName\n    deliveryToCity\n    deliveryToCountry\n    deliveryToState\n    deliveryToUnlocode\n    deliveryToAddress1\n    deliveryToAddress2\n    deliveryActualDate\n    deliveryEstimatedDate\n    containers {\n      edges {\n        node {\n          snowflakeId\n          containerNumber\n          containerMode\n          declarationId\n          deliveryMode\n          containerCountAndType\n          containerType\n          sealNumber\n          companyContainerKey\n          lastMilestoneTracked\n          lastMilestoneTrackedDate\n          estimatedPickupDate\n          actualPickupDate\n          estimatedDeliveryDate\n          actualDeliveryDate\n          containerGrossWeight\n          teus\n          containerShipmentGoodsVolume\n          containerShipmentGoodsWeight\n          containerShipmentGoodsDescription\n          ctoStorageStartDate\n          cfsStorageStartDate\n          emptyReturnRequiredByDate\n          emptyReturnedOnDate\n          emptyRequiredByDate\n          emptyReleasedFromContainerYardDate\n          wharfGateInDate\n          fclLoadedDate\n          fclUnloadDate\n          ctoAvailableDate\n          wharfGateOutDate\n          arrivalPortTransportBookedDate\n          cfsAvailableDate\n          importReleaseNumber\n          emptyReadyDate\n          exportReleaseNumber\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    milestones {\n      edges {\n        node {\n          snowflakeId\n          milestoneSequenceNumber\n          milestoneDescription\n          milestoneReferenceNumber\n          milestoneActualDate\n          milestoneActualDateUtc\n          milestoneEstimatedDate\n          milestoneEstimatedDateUtc\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    shipmentLegs {\n      edges {\n        node {\n          snowflakeId\n          arrivalActual\n          arrivalEstimated\n          departureActual\n          departureEstimated\n          ladingPort\n          ladingPortDescription\n          arrivalPort\n          arrivalPortDescription\n          legCarrierName\n          transportMode\n          vesselName\n          voyageNumber\n          legSequenceNumber\n          legType\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    packingLines {\n      edges {\n        node {\n          snowflakeId\n          packOrder\n          packType\n          goodsDescription\n          quantity\n          weight\n          volume\n          companyPackingLineKey\n          companyContainerKey\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}"
                }),
                "method": "POST",
                "mode": "cors",
                "credentials": "include"
            });

            const data = await response.json();
            return { shipmentNumber, data };
        } catch (error) {
            return { shipmentNumber, error: error.message };
        }
    };

    // Main execution
    try {
        const initialShipment = `S000${START}`;
        console.log("Performing initial search for:", initialShipment);
        const sessionData = await performInitialSearch(initialShipment);
        console.log("Initial search completed");

        const responses = [];

        // Process in batches using the session data
        for (let i = START; i <= END; i += BATCH_SIZE) {
            const batchEnd = Math.min(i + BATCH_SIZE - 1, END);
            const batchPromises = Array.from(
                { length: batchEnd - i + 1 }, 
                (_, index) => fetchShipmentDetails(`S000${i + index}`, sessionData)
            );

            // Wait for this batch to complete
            const batchResponses = await Promise.all(batchPromises);
            responses.push(...batchResponses);

            console.log(`Processed batch from ${i} to ${batchEnd}`);
        }

        // Download results
        const blob = new Blob([JSON.stringify(responses, null, 2)], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "shipment_responses.txt";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error("Script execution failed:", error);
    }
})();
