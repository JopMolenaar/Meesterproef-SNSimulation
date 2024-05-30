import Person from "./Person.js";
import Post from "./Post.js";
import Edge from "./Edge.js";
import Cursor from "./cursor.js";
import fetchUsers from "./api.js";

const cursor = new Cursor();

const canvas = document.getElementById("nodeCanvas");
const canvasContainer = document.getElementById("canvasContainer");
let canvasSize = { width: canvas.width, height: canvas.height };
const nodeDataContainer = document.getElementById("nodeDataContainer");
nodeDataContainer.style.display = "none";
const selectedNodeOptions = document.getElementById("selectedNodeOptions");
const generalOptions = document.getElementById("generalOptions");
const randomPeopleButton = document.getElementById("addRandomPeopleButton");
const randomContentButton = document.getElementById("addRandomContentButton");
const deleteNodeButton = document.getElementById("deleteNode");
const calcClosenessCentrality = document.getElementById("calcClosenessCentrality");
const increasedPopularityInput = document.getElementById("nodePopularity");
const calcGroupsButton = document.getElementById("calcGroups");
const countInputs = document.querySelectorAll(".counter-input");
let linkStripe;
let mouseMoveHandler;
let scrollMoveHandler;
let canvasRect;

//Global map of nodes
let nodes = new Map();

//Global map of links
let links = new Map();

//Variable to keep track of which node is selected
let selectedNode = null;

// Variable to keep track of which node is hovered
let hoveredNode = null;

// Initial resize to set canvas size
resizeCanvas();

///////////////////////////
///// Event listeners /////
///////////////////////////

// function for counter inputs
countInputs.forEach((input) => {
    const increaseButton = input.children[2];
    const decreaseButton = input.children[0];
    const countInput = input.children[1];
    let count = Number(countInput.value);
    const minValue = countInput.min ? Number(countInput.min) : false;
    const maxValue = countInput.max ? Number(countInput.max) : false;

    increaseButton.addEventListener("click", () => {
        count = Number(countInput.value);
        if (count < maxValue) {
            countInput.value = count + 1;
        }
    });

    decreaseButton.addEventListener("click", () => {
        count = Number(countInput.value);
        if (count > minValue) {
            countInput.value = count - 1;
        }
    });
});

randomPeopleButton.addEventListener("click", async () => {
    const count = document.getElementById("people-count").value;
    let userData = await fetchUsers(count);
    drawRandom("Person", count, userData);
});

randomContentButton.addEventListener("click", async () => {
    const count = document.getElementById("post-count").value;
    drawRandom("Social Media Post", count, null);
});

deleteNodeButton.addEventListener("click", () => {
    // deleteNode();
});

canvas.addEventListener("click", (event) => {
    spawnNode(event);
});

calcClosenessCentrality.addEventListener("click", () => {
    calculateAdjustedClosenessCentrality();
});

increasedPopularityInput.addEventListener("change", () => {
    // let selectedNodeData = nodes.get(selectedNode);
    selectedNode.increasedPopularity = increasedPopularityInput.value;
    resizeNodes(nodes);
    showSelectedNodeOptions();
});

calcGroupsButton.addEventListener("click", () => {
    findAllConnectedComponents();
});

// Add event listener for window resize
window.addEventListener("resize", resizeCanvas);

///////////////////////////
//////// Functions ////////
///////////////////////////

/**
 * Function to calculate the popularity of the post
 * @param {Number} numOfReaders - number of readers of the post
 */
function calculatePostPopularity(numOfReaders) {
    return numOfReaders * 1.5;
}

/**
 * Function for calculating popularity of the person based on the number of friends and info-links
 * @param {Number} numOfFriends - number of friends of the person
 * @param {Number} numOfInfoRefs - number of info-links of the person
 */
function calculatePersonPopularity(numOfFriends, numOfInfoRefs) {
    return numOfInfoRefs > 0 ? numOfFriends * 1.5 + numOfInfoRefs * 2 : numOfFriends * 1.5;
}

// Function to set canvas size to window size
function resizeCanvas() {
    if (canvasSize.width < canvasContainer.clientWidth || canvasSize.height < canvasContainer.height) {
        canvas.width = canvasContainer.clientWidth;
        canvas.height = canvasContainer.clientHeight;
        canvasSize = { width: canvasContainer.clientWidth, height: canvasContainer.clientHeight };
    }
}

// ...
function findAllConnectedComponents() {
    let visited = new Set();
    let components = [];
    // Filter to include only 'Person' nodes that have at least one friend
    let graph = new Map([...nodes].filter(([id, node]) => node.label === "Person" && node.friends && node.friends.length > 0));

    // Helper function to perform BFS and find all nodes connected to 'startNode'
    function bfs(startNode) {
        let queue = [startNode];
        let component = [];
        visited.add(startNode);
        component.push(startNode);

        while (queue.length > 0) {
            let currentNode = queue.shift();
            let neighbors = graph.get(currentNode).friends || [];

            neighbors.forEach((neighbor) => {
                if (!visited.has(neighbor) && graph.has(neighbor)) {
                    // Ensure neighbor is also a 'Person' with friends
                    visited.add(neighbor);
                    queue.push(neighbor);
                    component.push(neighbor);
                }
            });
        }
        return component;
    }

    // Main loop to initiate BFS from each unvisited node that has friends
    graph.forEach((_, node) => {
        if (!visited.has(node)) {
            let component = bfs(node);
            if (component.length > 1) {
                // Only consider components with more than one node
                components.push(component);
            }
        }
    });

    console.log("Total number of connected components:", components.length);
    console.log("Connected components:", components);
}

/**
 * ...
 * @param {map} nodes - ...
 */
function resizeNodes(nodes) {
    nodes.forEach((node, id) => {
        if (node.label === "Person") {
            node.popularity = calculatePersonPopularity(node.friends?.size || 0, checkInfoLinkRefs(id).size || 0);
        } else if (node.label === "Social Media Post") {
            node.popularity = calculatePostPopularity(node.readers?.size || 0);
        }
        node.element.style.width = (node.radius + node.popularity + Number(node.increasedPopularity)) * 2 + "px";
    });
}

/**
 * ...
 * @param {String} label - ...
 * @param {Number} count - ...
 * @param {Array} userData - ...
 */
function drawRandom(label, count, userData) {
for (var i = 0; i < count; i++) {
        let node;

        const id = nodes.size;
        const x = Math.random() * canvasSize.width;
        const y = Math.random() * canvasSize.height;
            
        switch (label) {
            case "Person":
                const image = userData[i].image;
                const username = userData[i].username;
                node = new Person(id, "Person", x, y, { image, username });
                break;
            case "Social Media Post":
                node = new Post(id, "Social Media Post", x, y);
                break;
            default:
                break;
        }

        nodes.set(id, node);
        node.draw();
        setEventListeners(node);
    }
}


/**
 * Function to spawn a node on the canvas given the position of the cursor
 * @param {Event} evt - ...
 */
async function spawnNode(evt) {
    let label = addPersonCheckbox.checked ? "Person" : addSocialMediaPostCheckbox.checked ? "Social Media Post" : "";

    if (label === "") {
        return;
    }

    let node;

    const id = nodes.size;
    const mousePos = getMousePosOnCanvas(canvasContainer, evt);

    switch (label) {
        case "Person":
            let userData = await fetchUsers(1);
            const image = userData[0].image;
            const username = userData[0].username;
            node = new Person(id, "Person", mousePos.x, mousePos.y, { image, username });
            break;
        case "Social Media Post":
            node = new Post(id, "Social Media Post", mousePos.x, mousePos.y);
            break;
        default:
            break;
    }

    nodes.set(id, node);
    node.draw();
    setEventListeners(node);
}

/**
 * ...
 * @param {Map} nodes - ...
 */
function setEventListeners(node) {
    node.element.addEventListener("mouseover", function () {
        hoveredNode = node.id;
        if (nodes.get(node.id).label === "Person") {
            showNodeDataContainer(node.id, nodes.get(node.id));
        }
    });

    node.element.addEventListener("mouseout", function () {
        hoveredNode = null;
        nodeDataContainer.style.display = "none";
    });

    node.element.addEventListener("click", function () {
        //Check whether the node is a person node or a social media post node
        switch (selectedNode) {
            case null:
                selectNode(node);
                showSelectedNodeOptions();
                generalOptions.classList.add("hide");
                break;
            case node:
                deselectNode(node);
                selectedNodeOptions.classList.add("hide");
                generalOptions.classList.remove("hide");
                break;
            default:
                const nodeHovered = nodes.get(hoveredNode);
                nodeHovered.linkHandler(selectedNode, links);
                resizeNodes(nodes);
                showSelectedNodeOptions();
        }
    });

    canvas.addEventListener("click", () => {
        if (selectedNode === node) {
            deselectNode(node);
            selectedNodeOptions.classList.add("hide");
            generalOptions.classList.remove("hide");
        }
    });
}

/**
 * Function to get the position of the cursor on the canvas, This is needed to place the nodes based on where you click
 * @param {Element} canvas - ...
 * @param {Event} evt - ...
 */
function getMousePosOnCanvas(canvas, e, scroll) {
    let canvasRect = canvas.getBoundingClientRect();
    if (scroll) {
        return {
            x: scroll.x + canvasContainer.scrollLeft,
            y: scroll.y + canvasContainer.scrollTop,
        };
    } else {
        return {
            x: e.clientX - canvasRect.left + canvasContainer.scrollLeft,
            y: e.clientY - canvasRect.top + canvasContainer.scrollTop,
        };
    }
}

/**
 * Showdata function to display the nodeDataContainer with therein the node data when hovering over it
 * @param {Number} nodeId - ...
 * @param {Object} noteData - ...
 */
function showNodeDataContainer(nodeId, nodeData) {
    nodeDataContainer.children[0].textContent = nodeData.userName;
    nodeDataContainer.children[1].src = nodeData.profileImage;
    nodeDataContainer.children[2].children[0].textContent = nodeData.friends.size;
    nodeDataContainer.children[2].children[2].textContent = nodeData.popularity;
    nodeDataContainer.style.display = "grid";
    //Move the nodeDataContainer to the position of the node label
    nodeDataContainer.style.left = nodeData.x + 10 + "px";
    nodeDataContainer.style.top = nodeData.y + 10 + "px";
}

//Function for showing the selectedNodeOptions container with the right data when a node is selected
function showSelectedNodeOptions() {
    const image = document.getElementById("selectedNodeImage");

    image.src = selectedNode.profileImage;
    selectedNodeUserName.textContent = selectedNode.userName;

    selectedNodeUserFriends.textContent = selectedNode.friends.size;
    totalPopularity.textContent = Number(selectedNode.popularity) + Number(selectedNode.increasedPopularity);

    selectedNodeOptions.classList.remove("hide");
}

/**
 * Function for checking who has an info link with a given node
 * @param {Number} nodeId - ...
 */
function checkInfoLinkRefs(nodeId) {
    let refs = [];
    //Get all person nodes
    let personNodes = new Map([...nodes].filter(([id, node]) => node.label === "Person"));
    //Loop over all nodes in the map and check if the given node has an info link with them
    personNodes.forEach((node, id) => {
        if (node.infoLinks.get(nodeId)) {
            refs.push(id);
        }
    });
    return refs;
}

/**
 * Show the link that follows the cursor
 * @param {Object} from - ...
 */
function showPreLink(from) {
    canvasRect = canvasContainer.getBoundingClientRect();
    const link = new Edge(from, from, "pre-link");

    linkStripe = link.element;
    let toCursor = { x: 0, y: 0 };
    mouseMoveHandler = (e) => {
        link.to = getMousePosOnCanvas(canvasContainer, e);
        link.calcAngle();
        toCursor = link.to;
    };
    scrollMoveHandler = () => {
        link.to = getMousePosOnCanvas(canvasContainer, 0, toCursor);
        link.calcAngle();
    };
    canvasContainer.addEventListener("mousemove", mouseMoveHandler);
    canvasContainer.addEventListener("scroll", scrollMoveHandler);

    linkStripe.addEventListener("click", () => {
        canvasContainer.removeEventListener("mousemove", mouseMoveHandler);
        linkStripe.remove();
        deselectNode();
    });

    canvasContainer.appendChild(linkStripe);
}

/**
 * Function for selecting a node and highlight it and its data
 * @param {Object} node - ...
 */
function selectNode(node) {
    node.element.classList.add("selected");

    if (node.label === "Person") {
        showPreLink(node);
    }

    selectedNode = node;
    if (node.label === "Person") {
        node.spawnForwardButtons(links);
    }
}

//Function for deselecting a node and remove the highlight
function deselectNode() {
    const node = selectedNode;

    node.element.classList.remove("selected");

    // Assuming that mouseMoveHandler is now a named function
    canvasContainer.removeEventListener("mousemove", mouseMoveHandler);
    canvasContainer.removeEventListener("scroll", scrollMoveHandler);
    if (linkStripe) {
        linkStripe.remove();
    }

    selectedNodeOptions.classList.add("hide");
    selectedNode = null;
    node.removeForwardButtons();
}

/**
 * Function for performing all behaviors of the agent in one step
 * @param {Object} node - ...
 */
function step(node) {
    node.readSocialMediaPost();
    node.forwardSocialMediaPost();
    node.manageRelationships();
    node.addFriendThroughContent();
    node.moveAgent();
}

//Function for calculating the closeness centrality of all nodes
function calculateAdjustedClosenessCentrality() {
    let centralities = {};
    let personNodes = new Map([...nodes].filter(([id, node]) => node.label === "Person"));
    personNodes.forEach((value, node) => {
        let shortestPaths = bfsShortestPath(nodes, node);
        let reachableNodes = Object.values(shortestPaths).filter((dist) => dist < Infinity).length;
        let totalDistance = Object.values(shortestPaths).reduce((acc, d) => (d < Infinity ? acc + d : acc), 0);

        if (reachableNodes > 1) {
            // Avoid division by zero if no nodes are reachable
            centralities[node] = (reachableNodes - 1) / totalDistance;
        } else {
            centralities[node] = 0; // Or consider another approach for isolated nodes
        }
    });
}



/**
 * Function for calculating the shortest paths between all nodes
 * @param {Map} graph - ... (nodes)
 * @param {Object} startNode - ...
 */
function bfsShortestPath(graph, startNode) {
    let distances = {};
    let queue = [startNode];
    graph.forEach((_, node) => (distances[node] = Infinity)); // Initialize distances
    distances[startNode] = 0;

    while (queue.length > 0) {
        let currentNode = queue.shift();
        let currentDistance = distances[currentNode];
        let neighbors = graph.get(currentNode).friends; // Assuming 'friends' is the adjacency list
        console.log(neighbors);
        neighbors.forEach((neighbor) => {
            if (distances[neighbor] === Infinity) {
                // Node has not been visited
                queue.push(neighbor);
                distances[neighbor] = currentDistance + 1;
            }
        });
    }
    return distances;
}
