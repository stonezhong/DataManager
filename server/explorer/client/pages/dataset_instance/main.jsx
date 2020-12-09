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
        const execute_sql_app_id = this.props.app_context.execute_sql_app_id;

        return (
            <Container fluid>
                <Row><Col><h1>Asset</h1></Col></Row>
                <Row>
                    <Col>
                    {
                        this.props.app_context.dsi_list.map(dsi => <div id={`revision-${dsi.revision}`}  className="mb-4">
                            <DatasetInstanceView
                                key={dsi.id}
                                dsi={dsi}
                                dataset={dataset}
                                execute_sql_app_id={execute_sql_app_id}
                            />
                        </div>)
                    }
                    </Col>
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
