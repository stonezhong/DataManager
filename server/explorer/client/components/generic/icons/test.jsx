import React from 'react';

import Container from 'react-bootstrap/Container';
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'

import {AppIcon} from './main.jsx';

export class TestAppIcon extends React.Component {
    render() {
        return (
            <Container fluid>
                <h2>Test AppIcon</h2>
                <Row>
                    <Col sm={1}>dismiss</Col>
                    <Col>
                        <AppIcon
                            type="dismiss"
                            className="icon16"
                        />
                    </Col>
                </Row>

                <Row>
                    <Col sm={1}>checkmark</Col>
                    <Col>
                        <AppIcon
                            type="checkmark"
                            className="icon16"
                        />
                    </Col>
                </Row>
            </Container>
        );
    }
}
