import React from 'react'
import ReactDOM from 'react-dom'
import $ from 'jquery'

import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Container from 'react-bootstrap/Container'

import {get_app_context, get_app_config, get_current_user, get_tenant_id} from '/common_lib'
import {PipelineInstanceTable} from '/components/business/pipeline_group/pipeline_instance_table.jsx'
import {getPipelineGroup} from '/apis'

const _ = require("lodash");

class PipelineGroupPage extends React.Component {
    state = {
        pipeline_group: null
    };

    load_pipeline_group = () => {
        getPipelineGroup(this.props.tenant_id, this.props.pipeline_group_id).then(
            (result) => {
                this.setState(
                    state => {
                        state.pipeline_group = result;
                        return state;
                    },
                    () => {
                        setTimeout(this.load_pipeline_group, 2000)
                    }
                );
            }
        )
    };

    componentDidMount() {
        this.load_pipeline_group();
    }

    thePipelineGroupEditorRef = React.createRef();
    thePipelineSelectorRef    = React.createRef();


    render() {
        return (
            <div>
                <Container fluid>
                    {
                        this.state.pipeline_group && <div>
                            <Row>
                                <Col>
                                    <h1 className="c-ib">Execution - {this.state.pipeline_group.name}</h1>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <PipelineInstanceTable
                                        airflow_base_url = {this.props.app_config.AIRFLOW_BASE_URL}
                                        pipeline_instances = {this.state.pipeline_group.pis}
                                    />
                                </Col>
                            </Row>
                        </div>
                    }
                </Container>
            </div>
        )
    }
}

$(function() {
    const current_user = get_current_user()
    const app_context = get_app_context();
    const app_config = get_app_config();
    const tenant_id = get_tenant_id();

    ReactDOM.render(
        <PipelineGroupPage
            app_config = {app_config}
            current_user={current_user}
            pipeline_group_id={app_context.pipeline_group_id}
            tenant_id={tenant_id}
        />,
        document.getElementById('app')
    );
});
