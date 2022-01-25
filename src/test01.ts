import { EventEmitter } from 'events';

class MyEmitter extends EventEmitter {
    constructor() {
        super();
        this.on("event1", () => {
            console.log("event1 occured")
        })
    }
 }

const myEmitter = new MyEmitter();

myEmitter.on('event', () => {
    console.log('an event occurred!');
});


myEmitter.emit('event1');
