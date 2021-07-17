"use strict";
module.exports = class Product {
    constructor(title, price, thumbnail, id) {
        this.title = title;
        this.price = price;
        this.thumbnail = thumbnail;
        this.id = id;
    }
    showProduct() {
        return {
            title: this.title,
            price: this.price,
            thumbnail: this.thumbnail,
            id: this.id
        };
    }
};
