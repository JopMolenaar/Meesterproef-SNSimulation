// const socket = new WebSocket('ws://localhost:8765');
const canvas = document.getElementById('nodeCanvas');
const canvasContainer = document.getElementById('canvasContainer');
const ctx = canvas.getContext('2d');
const canvasSize = { width: canvas.width, height: canvas.height };
const nodeDataContainer = document.getElementById('nodeDataContainer');
const gridRange = { min: -1, max: 1 };
const addPersonCheckbox = document.getElementById('addPersonCheckbox');
const addSocialMediaPostCheckbox = document.getElementById('addSocialMediaPostCheckbox');
const selectedNodeOptions = document.getElementById('selectedNodeOptions');
const generalOptions = document.getElementById('generalOptions');
const standardPersonRadius = 8;
const standardPostRadius = 4;

//Global map of nodes
let nodes = new Map();

//Global map of links
let links = new Map();

//Global map of node labels
let nodeLabelMap = new Map();

//Variable to keep track of which node is selected
let selectedNode = null;

// Variable to keep track of which node is hovered
let hoveredNode = null

//Link colours in rgba format (blue, red, green) with 20% opacity
const linkColors = {
    "friend": "rgb(0, 255, 0)",
    "itemlink": "rgb(254, 143, 0)",
    "infolink": "rgb(0, 0, 255)"
};

//Node colours in rgba format (blue, red) with 100% opacity
const labelColors = {
    "Person": "blue",
    "Social Media Post": "red",
};

//Function for adding 10 person nodes on random positions on the canvas
function drawRandomPersonNodes() {
    for (var i = 0; i < 10; i++) {
        var x = Math.random() * canvasSize.width;
        var y = Math.random() * canvasSize.height;
        drawNode(x, y, 'Person');
        let nodeLabelRef = addNodeLabel({x, y}, nodes.size);
        addPersonNode(nodes.size, 'Person', x, y, [], [], [], nodeLabelRef);    
    }
}

//Function for adding 10 social media post nodes on random positions on the canvas
function drawRandomSocialMediaPostNodes() {
    for (var i = 0; i < 10; i++) {
        var x = Math.random() * canvasSize.width;
        var y = Math.random() * canvasSize.height;
        drawNode(x, y, 'Social Media Post');
        let nodeLabelRef = addNodeLabel({x, y}, nodes.size);
        addItemNode(nodes.size, 'Social Media Post', x, y, [], nodeLabelRef);
    }
}

//Handle checkbox behaviour
addPersonCheckbox.addEventListener('change', function() {
    if(addSocialMediaPostCheckbox.checked) {
        addSocialMediaPostCheckbox.checked = false;
    }
});

addSocialMediaPostCheckbox.addEventListener('change', function() {
    if(addPersonCheckbox.checked) {
        addPersonCheckbox.checked = false;
    }
});

//Function to get the position of the cursor on the canvas
function  getMousePosOnCanvas(canvas, evt) {
    var rect = canvas.getBoundingClientRect(), // abs. size of element
      scaleX = canvas.width / rect.width,    // relationship bitmap vs. element for x
      scaleY = canvas.height / rect.height;  // relationship bitmap vs. element for y
  
    return {
      x: (evt.clientX - rect.left) * scaleX,   // scale mouse coordinates after they have
      y: (evt.clientY - rect.top) * scaleY     // been adjusted to be relative to element
    }
}

//Showdata function to display the nodeDataContainer with therein the node data when hovering over it
function showNodeDataContainer(nodeId, noteData) {
    nodeDataContainer.children[0].innerHTML = nodeId;
    nodeDataContainer.children[1].innerHTML = noteData.label;
    nodeDataContainer.classList.remove('hide');
    //Move the nodeDataContainer to the position of the node label
    nodeDataContainer.style.left = (noteData.x + 10) + 'px';
    nodeDataContainer.style.top = (noteData.y + 10) + 'px';
}

//Function for showing the selectedNodeOptions container with the right data when a node is selected
function showSelectedNodeOptions() {
    let selectedNodeData = nodes.get(selectedNode);
    
    selectedNodeOptions.children[0].innerHTML = `Node ID: ${selectedNode}`;
    selectedNodeOptions.children[1].innerHTML = `X-position: ${selectedNodeData.x}`;
    selectedNodeOptions.children[2].innerHTML = `Y-position: ${selectedNodeData.y}`;
    selectedNodeOptions.children[3].innerHTML = `Label: ${selectedNodeData.label}`;
    selectedNodeOptions.children[4].innerHTML = `Popularity: ${Number(selectedNodeData.popularity) + Number(selectedNodeData.increasedPopularity)}`;
    selectedNodeOptions.children[5].children[0].value = selectedNodeData.increasedPopularity;
    selectedNodeOptions.classList.remove('hide');
}

// Function to draw a node on the canvas
function drawNode(x, y, label, opacity = 1, popularity = 0, increasedPopularity = 0) {
    ctx.globalAlpha = opacity;  // Set the global alpha based on the node's opacity
    popularity = Number(popularity);
    increasedPopularity = Number(increasedPopularity);
    ctx.beginPath();
    if(label === 'Person') {
        var radius = standardPersonRadius + popularity + increasedPopularity;
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
    }
    else if(label === 'Social Media Post') {
        var radius = standardPostRadius + popularity + increasedPopularity;
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
    }
    ctx.fillStyle = labelColors[label] || 'black';
    ctx.fill();
    ctx.globalAlpha = 1;  // Reset global alpha to default after drawing
}

// Function to add a label to the node in the body of the page absolutely positioned on the exact position of the node on the screen
function addNodeLabel(mousePos, nodeId) {
    let nodeLabel = document.createElement('div');
    nodeLabel.style.position = 'absolute';
    nodeLabel.style.left = (mousePos.x - 5) + 'px';
    nodeLabel.style.top = (mousePos.y - 5) + 'px';
    nodeLabel.style.width = '15px';
    nodeLabel.style.height = '15px';
    canvasContainer.appendChild(nodeLabel);

    // Link node ID to nodeLabel in the map
    nodeLabelMap.set(nodeId, nodeLabel);

    nodeLabel.addEventListener('mouseover', function() {
        hoveredNode = nodeId;
        console.log('Data:', nodes.get(nodeId));
        showNodeDataContainer(nodeId, nodes.get(nodeId));
    });

    nodeLabel.addEventListener('mouseout', function() {
        hoveredNode = null;
        nodeDataContainer.classList.add('hide');
    });
    
    nodeLabel.addEventListener('click', function() {
        //Check whether the node is a person node or a social media post node
        switch(selectedNode) {
            case null:
                selectNode(nodeId);
                showSelectedNodeOptions();
                generalOptions.classList.add('hide');
                break;
            case nodeId:
                deselectNode(nodeId);
                selectedNodeOptions.classList.add('hide');
                generalOptions.classList.remove('hide');
                break;
            default:
                let type = nodes.get(hoveredNode).label === 'Person' ? 'friend' : 'item';
                linkHandler(nodeId, type);
        }
    });

    return nodeLabel;
}

//Function to spawn a node on the canvas given the position of the cursor
function spawnNode(evt) {
    let label = addPersonCheckbox.checked ? 'Person' :
    addSocialMediaPostCheckbox.checked ? 'Social Media Post' :
    '';

    if(label === '') {
        return;
    }

    let nodeLabelRef;
    let nodeId = nodes.size;
    var mousePos = getMousePosOnCanvas(canvas, evt);

    switch(label) {
        case 'Person':
            drawNode(mousePos.x, mousePos.y, label);
            nodeLabelRef = addNodeLabel(mousePos, nodeId);  // Pass node ID to label function
            nodeId = nodes.size;
            addPersonNode(nodeId, label, mousePos.x, mousePos.y, [], [], [], nodeLabelRef);
            break;
        case 'Social Media Post':
            var mousePos = getMousePosOnCanvas(canvas, evt);
            drawNode(mousePos.x, mousePos.y, label);
            nodeLabelRef = addNodeLabel(mousePos, nodeId);  // Pass node ID to label function
            nodeId = nodes.size;
            addItemNode(nodeId, label, mousePos.x, mousePos.y, [], nodeLabelRef);
            break;
        default:
            break;
    }
}

//Function for adding person node to the global map of nodes
//Each node object has the following properties:
    //id: unique identifier
    //label: label of the node
    //x: x-coordinate of the node
    //y: y-coordinate of the node
    //friends: list of node ids that are friends with this node
    //items: list of item ids that this node has liked
    //nodeLabelRef: reference to the node label div element
function addPersonNode(id, label, x, y, friends, items, infolinks, nodeLabelRef, personRadius = standardPersonRadius, popularity = 0, increasedPopularity = 0) {
    nodes.set(id, {
        label: label,
        x: x,
        y: y,
        friends: friends,
        items: items,
        infolinks: infolinks,
        nodeLabelRef: nodeLabelRef,
        personRadius: personRadius,
        popularity: popularity,
        increasedPopularity: increasedPopularity,
        opacity: 1  // Default opacity is 1 (fully opaque)
    });
}

//Function for adding item node to the global map of nodes
//Each node object has the following properties:
    //id: unique identifier
    //label: label of the node
    //x: x-coordinate of the node
    //y: y-coordinate of the node
    //readers: list of node ids that are friends with this node
    //nodeLabelRef: reference to the node label div element
function addItemNode(id, label, x, y, readers, nodeLabelRef, postRadius = standardPostRadius, popularity = 0, increasedPopularity = 0) {
    nodes.set(id, {
        label: label,
        x: x,
        y: y,
        readers: readers,
        nodeLabelRef: nodeLabelRef,
        postRadius: postRadius,
        popularity: popularity,
        increasedPopularity: increasedPopularity,
        opacity: 1  // Default opacity is 1 (fully opaque)
    });
}

//Function for adding link to the global map of links
//Each link object has the following properties:
    //from: id of the node where the link originates
    //to: id of the node where the link ends
    //type: type of the link (friend, itemlink, infolink)
function addLink(from, to, type) {
    links.set(from + '-' + to, {
        from: from,
        to: to,
        type: type,
        thickness: 4
    });
}

//Function that spawns 'forward' buttons under each read social media post by the currently selected person node
function spawnForwardButtons() {
    let selectedNodeData = nodes.get(selectedNode);
    //Get the node ids of every social media post that the selected person node has read
    selectedNodeData.items.forEach(itemId => {
        let itemNodeData = nodes.get(itemId);
        let forwardButton = document.createElement('button');
        forwardButton.classList.add('forwardButton');
        forwardButton.innerHTML = 'Forward';
        forwardButton.style.position = 'absolute';
        forwardButton.style.left = (itemNodeData.x) + 'px';
        forwardButton.style.top = (itemNodeData.y) + 'px';
        forwardButton.addEventListener('click', function() {
            selectedNodeData.friends.forEach(friendId => {
                addItemLink(friendId, itemId);
                addInfoLink(friendId, selectedNode);
            });
        });
        canvasContainer.appendChild(forwardButton);
    });
}

//Function to remove all forward buttons from the canvas
function removeForwardButtons() {
    let forwardButtons = document.querySelectorAll('.forwardButton');
    forwardButtons.forEach(button => {
        button.remove();
    });
}

//Function for adding an info link between the currently selected node and the node with the given id
function addInfoLink(from, to) {
    let fromData = nodes.get(from);
    let toData = nodes.get(to);

    fromData.infolinks.push(to);

    addLink(from, to, 'infolink');
    drawLink(fromData, toData, 'infolink', 4);
}

//Function for removing an info link between the currently selected node and the node with the given id
function removeInfoLink(from, to) {
    links.delete(from + '-' + to);
    redrawCanvas();
}

//Function for selecting a node and highlight it and its data
function selectNode(selectedNodeId) {
    nodes.forEach((node, id) => {
        node.opacity = id === selectedNodeId ? 1 : 0.2;  // Selected node is fully opaque, others are more transparent
    });

    //Increase the thickness of the links of the selected node
    links.forEach(link => {
        if(link.from === selectedNodeId || link.to === selectedNodeId) {
            link.thickness = 4;
        }
    });
    selectedNode = selectedNodeId;
    if(nodes.get(selectedNodeId).label === 'Person'){
        spawnForwardButtons();
    }
    redrawCanvas();  // Redraw the entire canvas with updated opacities
}

//Function for deselecting a node and remove the highlight
function deselectNode() {
    nodes.forEach((node, id) => {
        node.opacity = 1;  // Reset opacity of all nodes to fully opaque
    });

    links.forEach(link => {
        link.thickness = 1;
    });

    let selectedNodeData = nodes.get(selectedNode);
    selectedNodeData.increasedPopularity = selectedNodeOptions.children[5].children[0].value;
    selectedNode = null;
    removeForwardButtons();
    redrawCanvas();  // Redraw the entire canvas with updated opacities
}

//Function for calculating popularity based on the number of friends and info links
function calculatePersonPopularity(numOfFriends, numOfInfoRefs) {
    return numOfInfoRefs > 0 ? (numOfFriends * 1.5) + (numOfInfoRefs * 2) : (numOfFriends * 1.5);
}

//Function for checking who has an info link with a given node
function checkInfoLinkRefs(nodeId) {
    let refs = [];
    //Get all person nodes
    let personNodes = new Map([...nodes].filter(([id, node]) => node.label === 'Person'));
    //Loop over all nodes in the map and check if the given node has an info link with them
    personNodes.forEach((node, id) => {
        if(node.infolinks.includes(nodeId)) {
            refs.push(id);
        }
    });
    return refs;
}

//Function for calculating social media post popularity based on the number of readers
function calculatePostPopularity(numOfReaders) {
    return (numOfReaders * 1.5);
}

//Function for redrawing the canvas
function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);  // Clear the canvas

    links.forEach(link => {
        let from = nodes.get(link.from);
        let to = nodes.get(link.to);
        drawLink(from, to, link.type, link.thickness);  // Redraw each link
    });

    nodes.forEach((node, id) => {
        if(node.label === 'Person') {
            drawNode(
                node.x, 
                node.y, 
                node.label, 
                node.opacity,
                node.popularity = calculatePersonPopularity(node.friends?.length || 0, checkInfoLinkRefs(id).length || 0),
                node.increasedPopularity
            );
        }
        else if(node.label === 'Social Media Post') {
            drawNode(
                node.x, 
                node.y, 
                node.label, 
                node.opacity,
                node.popularity = calculatePostPopularity(node.readers?.length || 0),
                node.increasedPopularity
            )
        }
    });
}

//Function for drawing a link between two nodes
function drawLink(from, to, type, thickness) {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = linkColors[type];
    ctx.lineWidth = thickness;
    ctx.stroke();
}

//Function for adding a friend link between the currently selected node and the node with the given id
function addFriend(from, to) {
    let currentlySelected = nodes.get(from);
    let toBeFriend = nodes.get(to);

    currentlySelected.friends.push(to);
    toBeFriend.friends.push(from);

    addLink(from, to, 'friend');
    drawLink(currentlySelected, toBeFriend, 'friend', 4);
    
}

//Function for adding an item link between the currently selected node and the node with the given id
function addItemLink(person, item) {
    let currentlySelectedPerson = nodes.get(person);
    let currentEyedItem = nodes.get(item);

    currentlySelectedPerson.items.push(item);
    currentEyedItem.readers.push(person);

    addLink(person, item, 'itemlink');
    drawLink(currentlySelectedPerson, currentEyedItem, 'itemlink', 4);
    
}

//Function for removing an item link between the currently selected node and the node with the given id
function removeItemLink(personId, itemId) {
    let personIdData = nodes.get(personId);
    let itemIdData = nodes.get(itemId);

    personIdData.items = personIdData.items.filter(itemId => itemId !== personId);
    itemIdData.readers = itemIdData.readers.filter(readerId => readerId !== personId);

    links.delete(personId + '-' + itemId);
    redrawCanvas();
    
}

//Function for removing a friend link between the currently selected node and the node with the given id
function removeFriend(personId, friendId) {
    let personIdData = nodes.get(personId);
    let friendIdData = nodes.get(friendId);

    personIdData.friends = personIdData.friends.filter(friendId => friendId !== friendId);
    friendIdData.friends = friendIdData.friends.filter(friendId => friendId !== personId);

    links.delete(personId + '-' + friendId);
    redrawCanvas();
}

//Function for handling link actions
function linkHandler(id, type) {
    if (type === 'friend') {
        friendsHandler(id);
    } else if (type === 'item') {
        itemHandler(id);
    }
}

//Function for handling friend actions
function friendsHandler(id) {
    if (nodes.get(selectedNode).friends.includes(id)) {
        removeFriend(selectedNode, id);
    } else {
        addFriend(selectedNode, id);
    }
}

//Function for handling item actions
function itemHandler(id) {
    if (nodes.get(selectedNode).items.includes(id)) {
        removeItemLink(selectedNode, id);
    } else {
        addItemLink(selectedNode, id);
    }
}

//Function for calculating the shortest paths between all nodes
function bfsShortestPath(graph, startNode) {
    let distances = {};
    let queue = [startNode];
    graph.forEach((_, node) => distances[node] = Infinity); // Initialize distances
    distances[startNode] = 0;

    while (queue.length > 0) {
        let currentNode = queue.shift();
        let currentDistance = distances[currentNode];
        let neighbors = graph.get(currentNode).friends; // Assuming 'friends' is the adjacency list
        console.log(neighbors);
        neighbors.forEach(neighbor => {
            if (distances[neighbor] === Infinity) { // Node has not been visited
                queue.push(neighbor);
                distances[neighbor] = currentDistance + 1;
            }
        });
    }
    return distances;
}

//Function for calculating the closeness centrality of all nodes
function calculateAdjustedClosenessCentrality() {
    let centralities = {};
    let personNodes = new Map([...nodes].filter(([id, node]) => node.label === 'Person'));
    personNodes.forEach((value, node) => {
        let shortestPaths = bfsShortestPath(nodes, node);
        let reachableNodes = Object.values(shortestPaths).filter(dist => dist < Infinity).length;
        let totalDistance = Object.values(shortestPaths).reduce((acc, d) => d < Infinity ? acc + d : acc, 0);

        if (reachableNodes > 1) { // Avoid division by zero if no nodes are reachable
            centralities[node] = (reachableNodes - 1) / totalDistance;
        } else {
            centralities[node] = 0; // Or consider another approach for isolated nodes
        }
    });

    console.log(centralities);
}

function findAllConnectedComponents() {
    let visited = new Set();
    let components = [];
    // Filter to include only 'Person' nodes that have at least one friend
    let graph = new Map([...nodes].filter(([id, node]) => node.label === 'Person' && node.friends && node.friends.length > 0));

    // Helper function to perform BFS and find all nodes connected to 'startNode'
    function bfs(startNode) {
        let queue = [startNode];
        let component = [];
        visited.add(startNode);
        component.push(startNode);

        while (queue.length > 0) {
            let currentNode = queue.shift();
            let neighbors = graph.get(currentNode).friends || [];

            neighbors.forEach(neighbor => {
                if (!visited.has(neighbor) && graph.has(neighbor)) { // Ensure neighbor is also a 'Person' with friends
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
            if (component.length > 1) { // Only consider components with more than one node
                components.push(component);
            }
        }
    });

    console.log('Total number of connected components:', components.length);
    console.log('Connected components:', components);
}


