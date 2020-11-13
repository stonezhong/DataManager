import React from 'react'

import Button from 'react-bootstrap/Button'

import Container from 'react-bootstrap/Container'
import {AlertBox} from './alert.jsx'

export class TestAlertBox extends React.Component {
    testAlertBoxRef = React.createRef();


    render() {
        return (
            <Container fluid>
                <h2>Test AlertBox</h2>
                <AlertBox ref={this.testAlertBoxRef}/>
                <Button
                    className="mr-2"
                    onClick={() => {
                        this.testAlertBoxRef.current.show("hello");
                    }}
                >
                    Show alert
                </Button>

            </Container>
        );
    }
}
