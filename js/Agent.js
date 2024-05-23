import Node from './Node.js';

export default class Agent extends Node {
	constructor(id, label, x, y, nodeElement, user) {
		super(id, label, x, y, 8, nodeElement);
		this.friends = new Map(); //Contains {friend: score} pairs
		this.items = new Map(); //Contains {item: score} pairs
        this.infoLinks = new Map(); //Contains {infoLink: score} pairs
		this.socialScore = 0.5; //Decides how social the agent is
        this.profileImage = user.picture;
        this.userName = user.login.username;
	}

	//Function for choosing a random social media post to read
	readSocialMediaPost() {
		//Pick a random node from the nodes map that has label of Social Media Post
		const socialMediaPosts = Array.from(nodes.values()).filter(node => node.label === "Social Media Post");
		const randomPost = socialMediaPosts[Math.floor(Math.random() * socialMediaPosts.length)];

		//Get the friends who have also read the post by checking the readers map of the post and see if it contains my friends
		const friendsThatReadPost = randomPost.readers.filter(reader => this.friends.has(reader));
		//From my friends who have read the post, get the scores they have with the post
		const friendScores = friendsThatReadPost.map(friend => randomPost.readers.get(friend));

		//Get the infolinks who have also read the post by checking the readers map of the post and see if it contains my infolinks
		const infoLinksThatReadPost = randomPost.readers.filter(reader => this.infoLinks.has(reader));
		//From my infolinks who have read the post, get the scores they have with the post
		const infoLinkScores = infoLinksThatReadPost.map(infoLink => randomPost.readers.get(infoLink));

		//Calculate the score of the post for me based on the scores of my friends and infolinks and also the distance to the post.
		//The score will be -1, 0 or 1 based on the average of the scores
		const myScore = (friendScores.reduce((a, b) => a + b, 0) + infoLinkScores.reduce((a, b) => a + b, 0)) / (friendScores.length + infoLinkScores.length);
		//Calculate the distance from me to the post
		const distance = Math.sqrt(Math.pow(this.x - randomPost.x, 2) + Math.pow(this.y - randomPost.y, 2));
		//Adjust the score based on the distance
		myScore = myScore - (distance / 100);
		//Change the score to -1, 0 or 1
		myScore = myScore > 0 ? 1 : myScore < 0 ? -1 : 0;

		//Add the post to my items with the calculated score
		this.items.set(randomPost, myScore);

		//Add myself to the readers of the post
		randomPost.readers.set(this, myScore);

		return myScore;
	}

	//Function for forwarding a social media post to friends
	forwardSocialMediaPost() {
		//Get a random post from my items
		const myPosts = Array.from(this.items.keys());
		const randomPost = myPosts[Math.floor(Math.random() * myPosts.length)];

		//Check what my score is with the post
		const myScore = this.items.get(randomPost);

		//If the score is positive, forward the post to all my friends.
		if (myScore > 0) {
			//With a percentage chance equal to my social score, forward the post to my friends
			if (Math.random() < this.socialScore) {
				this.friends.forEach(friend => {
					friend.receiveSocialMediaPost(this, randomPost, 'friend');
				});
			}
		}
	}

	//Function for receiving forwarded social media posts
	receiveSocialMediaPost(sender, post, relationship) {
		let relationshipScore = 0

		//Check if I have already read the post
		if (this.items.has(post)) {
			return;
		}
		
		if(relationship === 'friend') {
			//Check the relationship score between me and the sender
			relationshipScore = this.friends.get(sender);
		} else if(relationship === 'infoLink') {
			//Check the relationship score between me and the sender
			relationshipScore = this.infoLinks.get(sender);
		}
		
		//Check if the post is similar to posts I have read before by retrieving the x and y coordinates of the post and comparing them with the coordinates of my items
		let similarityThreshold = 10;
		const amountSimilarPosts = Array.from(this.items.keys()).filter(item => Math.abs(item.x - post.x) < similarityThreshold && Math.abs(item.y - post.y) < similarityThreshold).length;
		let isSimilar = amountSimilarPosts > this.items.size / 2 ? true : false;

		//Calculate a score for the post based on the relationship score and the similarity
		let postScore = relationshipScore + (isSimilar ? 1 : -1);

		//Add the post to my items with the calculated score
		this.items.set(post, postScore);

		//Add myself to the readers of the post
		post.readers.set(this, postScore);

		//if the postScore was negative, reduce the score between me and the sender by 1
		if (postScore < 0) {
			if(relationship === 'friend'){
				this.friends.set(sender, relationshipScore - 1);
			} else if(relationship === 'infoLink'){
				this.infoLinks.set(sender, relationshipScore - 1);
			}
		} else {
			//if the postScore was positive, increase the score between me and the sender by 1
			if(relationship === 'friend'){
				this.friends.set(sender, relationshipScore + 1);
			} else if(relationship === 'infoLink'){
				this.infoLinks.set(sender, relationshipScore + 1);
			}
		}
	}

	//Function for managing relationships with friends and infolinks
	manageRelationships(){
		this.friends.forEach((score, friend) => {
			//Check if there are any friends that have a score of -3 or lower and remove them
			if(score <= -3){
				friend.friends.delete(this);
				this.friends.delete(friend);
			}
			//Check if there are any friends that have a score of 3 or higher. If so, add person as infoLink
			if(score >= 3){
				this.infoLinks.set(friend, 0);
			}
		});

		//Check if there are any infolinks that have a score of -5 or lower and remove them
		this.infoLinks.forEach((score, infoLink) => {
			if(score <= -5){
				infoLink.infoLinks.delete(this);
				this.infoLinks.delete(infoLink);
			}
		});
	}

	//Function for adding friends through content
	addFriendThroughContent(){
		//Get an array of all posts I have read and liked
		const positivePosts = Array.from(this.items.keys()).filter(post => this.items.get(post) > 0);

		//For each post, flip a coin. If heads, add a random person that also liked the post as a friend
		positivePosts.forEach(post => {
			if(Math.random() > 0.5){
				//Get all people who have read the post and liked it
				const peopleThatReadPost = Array.from(post.readers.keys()).filter(reader => post.readers.get(reader) > 0 && reader !== this && !this.friends.has(reader));
				//Pick a random person from the list and add them as a friend
				const randomPerson = peopleThatReadPost[Math.floor(Math.random() * peopleThatReadPost.length)];
				this.friends.set(randomPerson, 0);
				randomPerson.friends.set(this, 0);
			}
		});
	}
	
	//Function for moving the agent to a new position
	moveAgent(){
		//Get all friends and infolinks with a score higher than 0
		const positiveFriends = Array.from(this.friends.keys()).filter(friend => this.friends.get(friend) > 0);
		const positiveInfoLinks = Array.from(this.infoLinks.keys()).filter(infoLink => this.infoLinks.get(infoLink) > 0);

		//Get all items with a score higher than 0
		const positiveItems = Array.from(this.items.keys()).filter(item => this.items.get(item) > 0);

		//Calculate the average position of all friends, infolinks and items
		let averageX = this.x;
		let averageY = this.y;
		positiveFriends.forEach(friend => {
			averageX += friend.x;
			averageY += friend.y;
		});
		positiveInfoLinks.forEach(infoLink => {
			averageX += infoLink.x;
			averageY += infoLink.y;
		});
		positiveItems.forEach(item => {
			averageX += item.x;
			averageY += item.y;
		});
		averageX = averageX / (positiveFriends.length + positiveInfoLinks.length + positiveItems.length + 1);
		averageY = averageY / (positiveFriends.length + positiveInfoLinks.length + positiveItems.length + 1);

		//Move the agent towards the average position
		let dx = averageX - this.x;
		let dy = averageY - this.y;
		let distance = Math.sqrt(dx * dx + dy * dy);

		if (distance > 0) {
			this.x += dx / distance;
			this.y += dy / distance;
		}
	}

	async step() {
		this.readSocialMediaPost();
		this.forwardSocialMediaPost();
		this.manageRelationships();
		this.addFriendThroughContent();
		this.moveAgent();
	}
}