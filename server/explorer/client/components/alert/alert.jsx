import React from 'react'

import Alert from 'react-bootstrap/Alert'

/*********************************************************************************
 * Purpose: Show a closeable error message box
 *
 *
 */
export class AlertBox extends React.Component {
    state = {
        show: false,
        variant: "danger",
        text: ""
    };

    show = (text, variant="danger") => {
        this.setState({
            show: true,
            variant: variant,
            text: text
        });
    };

    onClose = () => {
        this.setState({show: false});
    };


    render() {
        return (this.state.show &&
            <Alert
                variant={this.state.variant}
                onClose={this.onClose}
                dismissible
            >
                {this.state.text}
            </Alert>
        );
    }
}
