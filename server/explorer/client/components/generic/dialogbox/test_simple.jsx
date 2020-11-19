import React from 'react'

import Container from 'react-bootstrap/Container'
import Button from 'react-bootstrap/Button'

import {SimpleDialogBox} from './simple.jsx'

export class TestSimpleDialogBox extends React.Component {
    testSimpleDialogBoxRef = React.createRef();

    render() {
        return (
            <Container fluid>
                <h2>Test SimpleDialogBox</h2>
                <SimpleDialogBox
                    ref={this.testSimpleDialogBoxRef}
                />
                <Button
                    className="mr-2"
                    onClick={() => {
                        this.testSimpleDialogBoxRef.current.openDialog(
                            "title",
                            <p><b>content</b></p>
                        );
                    }}
                >
                    Open
                </Button>
            </Container>
        );
    }
}
