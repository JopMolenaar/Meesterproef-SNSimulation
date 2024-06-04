import Node from './Node.js';
import Edge from './Edge.js';

export default class Person extends Node {
    constructor(id, label, x, y, user) {
        super(id, label, x, y, 10);
        this.friends = new Map(); //Contains {friend: score} pairs
        this.items = new Map(); //Contains {item: score} pairs
        this.infoLinks = new Map(); //Contains {infoLink: score} pairs
        this.socialScore = 0.5; //Decides how social the agent is
        this.profileImage = user.image;
        this.userName = user.username;
    }

    //Function for choosing a random social media post to read
    readSocialMediaPost(nodes, links) {
        console.log("readSocialMediaPost function");
        //Pick a random node from the nodes map that has label of Social Media Post
        const socialMediaPosts = Array.from(nodes.values()).filter((node) => node.label === "Social Media Post");
        const randomPost = socialMediaPosts[Math.floor(Math.random() * socialMediaPosts.length)];

        //Get the friends who have also read the post by checking the readers map of the post and see if it contains my friends
        // const friendsThatReadPost = randomPost.readers.filter((reader) => this.friends.has(reader));
        const friendsThatReadPost = Array.from(randomPost.readers.keys()).filter((reader) => this.friends.has(reader)); // Is id
        //From my friends who have read the post, get the scores they have with the post
        const friendScores = friendsThatReadPost.map((friend) => {
            const reader = randomPost.readers.get(friend);
            return reader.score;
        }); // Gets the node that has this id, not the score

        //Get the infolinks who have also read the post by checking the readers map of the post and see if it contains my infolinks
        // const infoLinksThatReadPost = randomPost.readers.filter((reader) => this.infoLinks.has(reader));
        console.log("randomPost.readers", randomPost.readers, "this.friends", this.friends);
        const infoLinksThatReadPost = Array.from(randomPost.readers.keys()).filter((reader) => this.infoLinks.has(reader)); // Is id
        //From my infolinks who have read the post, get the scores they have with the post
        const infoLinkScores = infoLinksThatReadPost.map((infoLink) => {
            const reader = randomPost.readers.get(infoLink);
            return reader.score;
        }); // Gets the node that has this id, not the score

        console.log("infoLinksThatReadPost", infoLinksThatReadPost, "friendsThatReadPost", friendsThatReadPost);
        console.log("friendScores", friendScores, "infoLinkScores", infoLinkScores);

        //Calculate the score of the post for me based on the scores of my friends and infolinks and also the distance to the post.
        //The score will be -1, 0 or 1 based on the average of the scores
        let myScore = (friendScores.reduce((a, b) => a + b, 0) + infoLinkScores.reduce((a, b) => a + b, 0)) / (friendScores.length + infoLinkScores.length);

        //Calculate the distance from me to the post
        const distance = Math.sqrt(Math.pow(this.x - randomPost.x, 2) + Math.pow(this.y - randomPost.y, 2));
        //Adjust the score based on the distance
        console.log("myScore", myScore, "-", distance, "/", 100);
        myScore = myScore - distance / 100;
        //Change the score to -1, 0 or 1
        myScore = myScore > 0 ? 1 : myScore < 0 ? -1 : 0;
        console.log("MY SCORE", myScore);
        //Add the post to my items with the calculated score
        // randomPost.score = myScore;

        console.log("randomPost + score", randomPost, myScore);

        this.items.set(randomPost.id, { post: randomPost, score: myScore }); // add the my score
        // this.items.set(randomPost, myScore); This adds the randomPost as a key and the score as the value of that key

        //Add myself to the readers of the post
        randomPost.readers.set(this.id, { person: this, score: myScore });
        console.log("POST", randomPost, "READER", this);

        const link = new Edge(this, randomPost, "item-link");
        links.set(this.id + "-" + randomPost.id, link);
        link.drawLink();

        return myScore;
    }

    //Function for forwarding a social media post to friends
    forwardSocialMediaPost() {
        console.log("forwardSocialMediaPost function");
        //Get a random post from my items
        const myPosts = Array.from(this.items.keys());
        const randomPost = myPosts[Math.floor(Math.random() * myPosts.length)];
        // randomPost = id
        // myPosts = array with id's
        console.log("RANDOMPOST", randomPost, "MYPOSTS", myPosts);
        //Check what my score is with the post
        // console.log(this.items);
        const postObject = this.items.get(randomPost);

        console.log("this", this, "random post", postObject); // postObject = object

        //If the score is positive, forward the post to all my friends.
        if (postObject.score > 0) {
            console.log("myScore > 0", postObject.score);
            //With a percentage chance equal to my social score, forward the post to my friends
            if (Math.random() < this.socialScore) {
                this.friends.forEach((friend) => {
                    if(friend.person){
                        friend.person.receiveSocialMediaPost(this, postObject.post, "friend");
                    } else {
                        console.error("friend.person doesnt exist");
                    friend.receiveSocialMediaPost(this, postObject.post, "friend");
                    }
                    // friend.receiveSocialMediaPost(this, randomPost, "friend");
                });
            }
        } else {
            console.log("myScore < 0", postObject);
        }
    }

    //Function for receiving forwarded social media posts
    receiveSocialMediaPost(sender, post, relationship) {
        console.log("receiveSocialMediaPost function");
        let relationshipScore = 0;

        //Check if I have already read the post
        if (this.items.has(post.id)) {
            console.log("this.items.has(post.id)");
            return;
        }

        if (relationship === "friend") {
            //Check the relationship score between me and the sender
            const friend = this.friends.get(sender.id); // TODO add score when adding friend
            relationshipScore = friend.score;
        } else if (relationship === "infoLink") {
            //Check the relationship score between me and the sender
            const sender = this.infoLinks.get(sender.id); // TODO add score when adding infolink
            relationshipScore = sender.score;
        }

        //Check if the post is similar to posts I have read before by retrieving the x and y coordinates of the post and comparing them with the coordinates of my items
        let similarityThreshold = 10;
        const amountSimilarPosts = Array.from(this.items.keys()).filter(
            (item) => Math.abs(item.post.x - post.x) < similarityThreshold && Math.abs(item.post.y - post.y) < similarityThreshold
        ).length;
        console.log("amountSimilarPosts", amountSimilarPosts);
        let isSimilar = amountSimilarPosts > this.items.size / 2 ? true : false;

        //Calculate a score for the post based on the relationship score and the similarity
        let postScore = relationshipScore + (isSimilar ? 1 : -1);

        //Add the post to my items with the calculated score
        // this.items.set(post, postScore); // TODO
        this.items.set(post.id, { post: post, score: postScore });

        //Add myself to the readers of the post
        post.readers.set(this.id, { person: this, score: postScore });

        //if the postScore was negative, reduce the score between me and the sender by 1
        if (postScore < 0) {
            console.log("DECREASE FRIEND RELATIONSHIP", this, sender, "relationship:", relationship);
            if (relationship === "friend") {
                // TODO draw link and maybe use the existing functions
                this.friends.set(sender.id, { person: sender, score: relationshipScore - 1 }); // TODO relationshipScore zit niet in de friends map
            } else if (relationship === "infoLink") {
                // this.addInfoLink(sender, this, links);
                this.infoLinks.set(sender.id, { person: sender, score: relationshipScore - 1 });
            }
        } else {
            console.log("IMPROVE FRIEND RELATIONSHIP", this, sender, "relationship:", relationship);
            //if the postScore was positive, increase the score between me and the sender by 1
            if (relationship === "friend") {
                this.friends.set(sender.id, { person: sender, score: relationshipScore + 1 });
            } else if (relationship === "infoLink") {
                this.infoLinks.set(sender.id, { person: sender, score: relationshipScore + 1 });
            }
        }
    }

    //Function for managing relationships with friends and infolinks
    manageRelationships() {
        console.log("manageRelationships function");
        this.friends.forEach((aFriend) => {
            console.log("friend:", aFriend);
            let score;
            let friend;
            if(!aFriend.person){
                console.error("friend.person is not a thing")
                score = aFriend.score;
                friend = aFriend.person;
            } else {
                score = 3;
                friend = aFriend
            }

            //Check if there are any friends that have a score of -3 or lower and remove them
            if (score <= -3) {
                friend.friends.delete(this);
                this.friends.delete(friend.id);
            }
            //Check if there are any friends that have a score of 3 or higher. If so, add person as infoLink
            if (score >= 3) {
                this.infoLinks.set(friend.id, {person: friend, score: 0}); // 0 is default
                console.log("Set info link", this, friend);
            }
        });

        //Check if there are any infolinks that have a score of -5 or lower and remove them
        this.infoLinks.forEach((score, infoLink) => {
            if (score <= -5) {
                infoLink.infoLinks.delete(this);
                this.infoLinks.delete(infoLink);
            }
        });
    }

    //Function for adding friends through content
    addFriendThroughContent() {
        console.log("add friend function");
        //Get an array of all posts I have read and liked
        const positivePosts = Array.from(this.items.keys()).filter((post) => {
            console.log("Post", post);
            console.log(this.items.get(post) > 0);
            return this.items.get(post) > 0
        });
        console.log("positivePosts", positivePosts);
        //For each post, flip a coin. If heads, add a random person that also liked the post as a friend
        positivePosts.forEach((post) => {
            if (Math.random() > 0.5) {
                console.log("Math.random() > 0.5", post);
                //Get all people who have read the post and liked it
                const peopleThatReadPost = Array.from(post.readers.keys()).filter(
                    (reader) => post.readers.get(reader) > 0 && reader !== this && !this.friends.has(reader)
                );
                //Pick a random person from the list and add them as a friend
                const randomPerson = peopleThatReadPost[Math.floor(Math.random() * peopleThatReadPost.length)];
                this.friends.set(randomPerson.id, {person: randomPerson, score: 0});
                randomPerson.friends.set(this.id, {person: this, score: 0});
                console.log("ADDED FRIEND", randomPerson, " TO ", this);
            }
        });
    }

    // get(friend.id) en movenode moet naar person
    //Function for moving the agent to a new position
    moveNode() {
        // TODO krijgt nergens een friend of infolink toegewezen
        //Get all friends and infolinks with a score higher than 0
        // console.log(this.friends.get(friend), this.infoLinks.get(infoLink));
        console.log("this friends:", this.friends);
        const positiveFriends = Array.from(this.friends.values()).filter((friend) => {
            console.log(this.friends, friend, friend); // friend is id
            const foundFriend = this.friends.get(friend.person.id);
            console.log("foundFriend", foundFriend);
            if (foundFriend.score >= 0) {
                // TODO remove the = later
                return foundFriend;
            } else if (foundFriend.score < 0) {
                console.log("foundFriend.score is lower than 0");
            } else {
                console.log("foundFriend.score is not found in this friend", foundFriend);
            }
            // return this.friends.get(friend) > 0;
        });
        const positiveInfoLinks = Array.from(this.infoLinks.values()).filter((infoLink) => {
            const foundInfoLink = this.infoLinks.get(infoLink.person.id);
            console.log("foundInfoLink", foundInfoLink);
            if (foundInfoLink.score >= 0) {
                // TODO remove the = later
                return foundInfoLink;
            } else if (foundInfoLink.score < 0) {
                console.log("foundInfoLink.score is lower than 0");
            } else {
                console.log("foundInfoLink.score is not found in this foundInfoLink", foundInfoLink);
            }
            // return this.infoLinks.get(infoLink) > 0
        });
        console.log("posFriends:", positiveFriends, "posInfolinks", positiveInfoLinks);
        //Get all items with a score higher than 0
        const positiveItems = Array.from(this.items.values()).filter((item) => {
            const foundItem = this.items.get(item.post.id);
            console.log("foundItem", foundItem);
            if (foundItem.score >= 0) {
                // TODO remove the = later
                return foundItem;
            } else if (foundItem.score < 0) {
                console.log("foundItem.score is lower than 0");
            } else {
                console.log("foundItem.score is not found in this foundItem", foundItem);
            }
        });

        //Calculate the average position of all friends, infolinks and items
        let averageX = this.x;
        let averageY = this.y;

        console.log("PLACE", averageX, averageY, "THIS", this);
        positiveFriends.forEach((friend) => {
            console.log(friend);
            if (friend.person) {
                friend = friend.person;
            }
            averageX += friend.x;
            averageY += friend.y;
            console.log("FRIEND X + Y", friend.x, friend.y);
        });
        positiveInfoLinks.forEach((infoLink) => {
            console.log(infoLink); // TODO this infolink had a object in person
            if (infoLink.person && !infoLink.person.person) {
                infoLink = infoLink.person;
            } else if (infoLink.person.person && !infoLink.person.person.person) {
                infoLink = infoLink.person.person;
            } else if (infoLink.person.person.person) {
                infoLink = infoLink.person.person.person;
            }
            averageX += infoLink.x;
            averageY += infoLink.y;
            console.log("infoLink X + Y", infoLink.x, infoLink.y);
        });
        positiveItems.forEach((item) => {
            console.log(item);
            if (item.post) {
                item = item.post;
            }
            averageX += item.x;
            averageY += item.y;
            console.log("item X + Y", item.x, item.y);
        });
        averageX = averageX / (positiveFriends.length + positiveInfoLinks.length + positiveItems.length + 1);
        averageY = averageY / (positiveFriends.length + positiveInfoLinks.length + positiveItems.length + 1);

        //Move the agent towards the average position
        let dx = averageX - this.x;
        let dy = averageY - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            console.log("DISTANCE", distance);
            console.log("this x and y", this.x, this.y);
            this.x += dx / distance;
            this.y += dy / distance;
            this.element.style.left = this.x + "px";
            this.element.style.top = this.y + "px";
            console.log("this x and y after adding distance", this.x, this.y);
        } else {
            console.log("DISTANCE < 0", distance);
        }
    }

    /**
     * Function for performing all behaviors of the agent in one step
     * @param {Object} node - ...
     */
    step(nodes, links) {
        this.readSocialMediaPost(nodes, links);
        this.forwardSocialMediaPost();
        this.manageRelationships();
        this.addFriendThroughContent();
        this.moveNode();
    }

    //Function that spawns 'forward' buttons under each read social media post by the currently selected person node
    spawnForwardButtons(links) {
    	this.removeForwardButtons();
        //Get the node ids of every social media post that the selected person node has read
        this.items.forEach((item) => {
            let svgIcon = document.createElement("img");
            svgIcon.src = "./images/sns_icons_Send.svg";
            svgIcon.alt = "Forward";
            // console.log(item);
            let itemNodeData 
            if(item.post){
                itemNodeData = item.post;
            } else {
                itemNodeData = item;
            }
            let forwardButton = document.createElement("button");
            forwardButton.classList.add("forwardButton");
            forwardButton.appendChild(svgIcon);
            forwardButton.style.position = "absolute";
            forwardButton.style.left = itemNodeData.x + "px";
            forwardButton.style.top = itemNodeData.y + "px";
            forwardButton.addEventListener("click", () => {
                // const friendsArray = this.friends;
                this.friends.forEach((friend) => {
                    if(friend.person){
                        friend = friend.person;
                    } 
                    this.addItemLink(itemNodeData, friend, links);
                    this.addInfoLink(friend, this, links);
                });
            });
            canvasContainer.appendChild(forwardButton);
        });
    }

    //Function to remove all forward buttons from the canvas
    removeForwardButtons() {
        let forwardButtons = document.querySelectorAll(".forwardButton");
        forwardButtons.forEach((button) => {
            button.remove();
        });
    }

    //Function for adding a friend link between the currently selected node and the node with the given id
    addFriend(node, links) {
        let toBeFriend = node;

        this.friends.set(node.id, {person: node, score: 0});
        toBeFriend.friends.set(this.id, {person: this, score: 0});

        const link = new Edge(this, node, "friend-link");
        links.set(this.id + "-" + toBeFriend.id, link);
        // link.drawLink();
    }

    removeFriend(node, links) {
        let linkKey1 = this.id + "-" + node.id;
        let linkKey2 = node.id + "-" + this.id;

        let linkElement1 = links.get(linkKey1);
        let linkElement2 = links.get(linkKey2);

        if (linkElement1 !== undefined && linkElement1.element !== undefined) {
            linkElement1.element.remove();
        } else if (linkElement2 !== undefined && linkElement2.element !== undefined) {
            linkElement2.element.remove();
        } else {
            return;
        }

        this.friends.delete(node.id);
        //  = this.friends.filter((id) => id !== node.id);
        node.friends.delete(this.id);
        // = node.friends.filter((id) => id !== this.id);

        links.delete(linkKey1);
        links.delete(linkKey2);
        //redrawCanvas(); // Redraws the links
        // resizeNodes(nodes);
    }

    //Function for adding an item link between the currently selected node and the node with the given id
    addItemLink(item, from, links) {
        let currentlySelectedPerson = from;
        let currentEyedItem = item;
        console.log(currentlySelectedPerson);
        currentlySelectedPerson.items.set(item.id, { post: item, score: 1 });
        currentEyedItem.readers.set(from.id, { person: from, score: 1 });

        const link = new Edge(from, item, "item-link");
        links.set(from.id + "-" + item.id, link);
    }

    //Function for removing an item link between the currently selected node and the node with the given id
    removeItemLink(item, links) {
        this.items.delete(item.id);
        item.readers.delete(this.id);

        links.get(this.id + "-" + item.id).element.remove();
        links.delete(this.id + "-" + item.id);
    }

    //Function for adding an info link between the currently selected node and the node with the given id
    addInfoLink(from, to, links) {
        from.infoLinks.set(to.id, {person: to, score: 0});

        const link = new Edge(from, to, "info-link");
        links.set(from.id + "-" + to.id, link);
    }

    //Function for removing an info link between the currently selected node and the node with the given id
    removeInfoLink(from, to, links) {
        links.get(from + "-" + to).element.remove();
        links.delete(`${from}-${to}`);
    }
}