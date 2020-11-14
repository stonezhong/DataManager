import React from 'react'

import Button from 'react-bootstrap/Button'

import Container from 'react-bootstrap/Container'
import {TopMessage} from './main.jsx'

export class TestTopMessage extends React.Component {
    testTestTopMessageRef = React.createRef();

    render() {
        return (
            <Container fluid>
                <h2>Test TopMessage</h2>
                <TopMessage ref={this.testTestTopMessageRef}/>
                <Button
                    className="mr-2"
                    onClick={() => {
                        this.testTestTopMessageRef.current.show("danger", "hello");
                    }}
                >
                    Show alert
                </Button>

            </Container>
        );
    }
}
