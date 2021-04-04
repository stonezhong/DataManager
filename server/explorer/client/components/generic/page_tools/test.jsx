import React from 'react';

import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'

import {PageHeader} from './index.js';

export class TestPageHeader extends React.Component {
    render() {
        return (
            <Container fluid>
                <h2>Test PageHeader</h2>
                <Row>
                    <Col>
                        <PageHeader title="Test">
                            <Button size="sm" className="ml-2">button 1</Button>
                            <Button size="sm" className="ml-2">button 2</Button>
                            <span className="ml-2">subtitle</span>
                        </PageHeader>
                    </Col>
                </Row>
            </Container>
        );
    }
}
