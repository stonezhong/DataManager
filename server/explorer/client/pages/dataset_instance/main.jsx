import React from 'react'
import ReactDOM from 'react-dom'

import Container from 'react-bootstrap/Container'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'

import $ from 'jquery'

import {get_current_user, get_app_context} from '/common_lib'
import {DatasetInstanceView} from '/components/business/dataset/dataset_instance_revision.jsx'

class DatasetInstancePage extends React.Component {
    render() {
        const dataset = this.props.app_context.ds;

        return (
            <Container fluid>
                <Row><Col><h1>Asset</h1></Col></Row>
                <Row>
                    {
                        this.props.app_context.dsi_list.map(dsi => <Col xs={6} id={`revision-${dsi.revision}`}>
                            <DatasetInstanceView key={dsi.id} dsi={dsi} dataset={dataset}/>
                        </Col>)
                    }
                </Row>
            </Container>
        )
    }
}

$(function() {
    const current_user = get_current_user();
    const app_context = get_app_context();

    ReactDOM.render(
        <DatasetInstancePage
            current_user={current_user}
            app_context={app_context}
        />,
        document.getElementById('app')
    );
});
