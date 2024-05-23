import Node from './Node.js';

export default class SocialMediaPost extends Node {
	constructor(id, label, x, y, nodeElement, author) {
		super(id, label, x, y, 4, nodeElement);
		this.readers = new Map();
        this.author = author;
	}
}