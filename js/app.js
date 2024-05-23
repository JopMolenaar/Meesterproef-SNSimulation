// const socket = new WebSocket('ws://localhost:8765');
const canvas = document.getElementById("nodeCanvas");
const canvasContainer = document.getElementById("canvasContainer");
const ctx = canvas.getContext("2d"); // Only used now for the links
let canvasSize = { width: canvas.width, height: canvas.height };

const nodeDataContainer = document.getElementById("nodeDataContainer");
nodeDataContainer.style.display = "none";
const gridRange = { min: -1, max: 1 };
// const addPersonCheckbox = document.getElementById("addPersonCheckbox");
// const addSocialMediaPostCheckbox = document.getElementById("addSocialMediaPostCheckbox");
const selectedNodeOptions = document.getElementById("selectedNodeOptions");
const generalOptions = document.getElementById("generalOptions");
const standardPersonRadius = 10;
const standardPostRadius = 5;

const randomPeopleButton = document.getElementById("addRandomPeopleButton");
const randomContentButton = document.getElementById("addRandomContentButton");
const deleteNodeButton = document.getElementById("deleteNode");
const calcClosenessCentrality = document.getElementById("calcClosenessCentrality");
const increasedPopularityInput = document.getElementById("nodePopularity");
const calcGroupsButton = document.getElementById("calcGroups");

//Global map of nodes
let nodes = new Map();

//Global map of links
let links = new Map();

//Global map of node labels
let nodeLabelMap = new Map();

//Variable to keep track of which node is selected
let selectedNode = null;

// Variable to keep track of which node is hovered
let hoveredNode = null;

//Node colours in rgba format (blue, red) with 100% opacity
const labelColors = {
    Person: "blue",
    "Social Media Post": "red",
};

// function for counter inputs
const countInputs = document.querySelectorAll(".counter-input");

countInputs.forEach(input => {
    const increaseButton = input.children[2];
    const decreaseButton = input.children[0];
    const countInput = input.children[1];
    let count = Number(countInput.value);
    const minValue = countInput.min ? Number(countInput.min) : false;
    const maxValue = countInput.max ? Number(countInput.max) : false;

    increaseButton.addEventListener("click", () => {
        count = Number(countInput.value);
        if(count < maxValue) {
            countInput.value = count + 1;
        }
    });

    decreaseButton.addEventListener("click", () => {
        count = Number(countInput.value);
        if(count > minValue) {
            countInput.value = count - 1;
        }
    });

});

// api picture and data

randomPeopleButton.addEventListener("click", async () => {
    // drawRandomPersonNodes();
    const count = document.getElementById("people-count").value;

    let userData = await fetchUsers(count);
    console.log(userData);

    drawRandom("Person", count, userData);

    // change image
    // const image = document.getElementById(`image`);
    // image.src = userData.image;
});
randomContentButton.addEventListener("click", () => {
    // drawRandomSocialMediaPostNodes();
    drawRandom("Social Media Post", null, null);
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
    let selectedNodeData = nodes.get(selectedNode);
    selectedNodeData.increasedPopularity = increasedPopularityInput.value;
    resizeNodes(nodes);
});

calcGroupsButton.addEventListener("click", () => {
    findAllConnectedComponents();
});

//Function for calculating social media post popularity based on the number of readers
function calculatePostPopularity(numOfReaders) {
    return numOfReaders * 1.5;
}
//Function for calculating popularity based on the number of friends and info links
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

// Initial resize to set canvas size
resizeCanvas();

// Add event listener for window resize
window.addEventListener("resize", resizeCanvas);

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