import React from 'react'

import Alert from 'react-bootstrap/Alert'

const _ = require("lodash");

export class TopMessage extends React.Component {
    state = {
        messages: [],  // message is an object that has variant and text
        maxId: 0,
    };

    show = (variant, text) => {
        // variant can be "primary", "secondary", "success", "danger", "warning"
        //                "info", "light", "dark"
        this.setState(state => {
            const messageId = state.maxId + 1;
            state.messages.push({
                id: messageId,
                variant: variant,
                text: text,
            });
            state.maxId = messageId;
            return state;
        });
    };

    onClose = (messageId) => {
        this.setState(state => {
            _.remove(state.messages, message => message.id === messageId);
            return state;
        });
    };

    render() {
        return (
            <div>
                {this.state.messages.map(message => {
                    return (
                        <Alert
                            key={message.id}
                            variant={message.variant}
                            onClose={() => {this.onClose(message.id)}}
                            dismissible
                        >
                            {message.text}
                        </Alert>
                    );
                })}
            </div>
        )
    }
}
