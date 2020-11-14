import React from 'react'
import ReactDOM from 'react-dom'
import $ from 'jquery'

import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Container from 'react-bootstrap/Container'

import {DatasetInstanceTable} from '/components/dataset/dataset_instance_table.jsx'
import {TopMessage} from '/components/generic/top_message/main.jsx'

import {get_app_context, get_current_user} from '/common_lib'


class DatasetPage extends React.Component {
    theTopMessageRef = React.createRef();

    state = {
        dataset_instances: [],
    };

    componentDidMount() {
        fetch(`/api/Datasets/${this.props.dataset.id}/children/`)
            .then(res => res.json())
            .then(result => {
                this.setState({dataset_instances: result})
            })
            .catch(() => {
                this.theTopMessageRef.current.show("danger", "Unable to list assets!");
            })
    }

    render() {
        return (
            <Container fluid>
                <TopMessage ref={this.theTopMessageRef} />
                <Row>
                    <Col>
                        <h1>Dataset - {this.props.dataset.name}</h1>
                        <hr />
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <div dangerouslySetInnerHTML={ {__html: this.props.dataset.description } }/>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <i>Published by { this.props.dataset.author } from { this.props.dataset.team } team at { this.props.dataset.publish_time }.</i>
                    </Col>
                </Row>
                <DatasetInstanceTable dataset_instances={this.state.dataset_instances}/>
            </Container>
        )
    }
}

$(function() {
    const current_user = get_current_user()
    const app_context = get_app_context();

    ReactDOM.render(
        <DatasetPage current_user={current_user} dataset={app_context.dataset} />,
        document.getElementById('app')
    );
});
