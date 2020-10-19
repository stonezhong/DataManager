import React from 'react'
import ReactDOM from 'react-dom'
import $ from 'jquery'

import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Table from 'react-bootstrap/Table'
import Container from 'react-bootstrap/Container'

import {get_app_context} from '/common_lib'

class DatasetInstances extends React.Component {
    render() {
        return (
            <Row>
                <Col>
                    <h1>Instances</h1>
                    <Table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Data Time</th>
                                <th>Publish Time</th>
                                <th>Row Count</th>
                                <th>Locations</th>
                            </tr>
                        </thead>
                        <tbody>
                            {this.props.dataset_instances.map((value) => {
                                return (
                                    <tr key={value.id}>
                                        <td>{value.name}</td>
                                        <td>{value.date_time}</td>
                                        <td>{value.publish_time}</td>
                                        <td>{value.row_count}</td>
                                        <td>

                                        <Table size="sm" borderless className="c-location-table">
                                            <tbody>
                                                {value.locations.map((location)=>{
                                                    return (
                                                        <tr key={location.offset}>
                                                            <td><small><code>{location.type}</code></small></td>
                                                            <td><small><code>{location.location}</code></small></td>
                                                            <td><small><code>{location.size}</code></small></td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </Table>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </Table>
                </Col>
            </Row>
        )
    }
}

class Dataset extends React.Component {
    state = {
        dataset_instances: [],
    };

    componentDidMount() {
        fetch(`/api/Datasets/${this.props.dataset.id}/children/`)
            .then(res => res.json())
            .then(result => {
                this.setState({dataset_instances: result})
            })

        // This is a example on how to use Promose.all
        // Promise.all([
        //     fetch(`/api/Datasets/${this.props.datasetId}/`),
        //     fetch(`/api/Datasets/${this.props.datasetId}/children/`)
        // ])
        // .then((responses) => {
        //     return Promise.all(responses.map(
        //         (response) => response.json()
        //     ))
        // })
        // .then(([dataset, dataset_instances]) => {
        //     this.setState({
        //         dataset: dataset,
        //         dataset_instances: dataset_instances
        //     })
        // })
    }

    render() {
        return (
            <Container fluid>
                <Row>
                    <Col>
                        <h1>Dataset - {this.props.dataset.name}</h1>
                        <hr />
                    </Col>
                </Row>
                <Row style={ {"marginBottom": "10px"} }>
                    <Col>
                        <i>Published by { this.props.dataset.author } from { this.props.dataset.team } team at { this.props.dataset.publish_time }.</i>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <h1>Description</h1>
                        <div dangerouslySetInnerHTML={ {__html: this.props.dataset.description } }/>
                    </Col>
                </Row>
                <DatasetInstances dataset_instances={this.state.dataset_instances}/>
            </Container>
        )
    }
}

$(function() {
    const username = document.getElementById('app').getAttribute("data-username");
    const app_context = get_app_context();

    ReactDOM.render(
        <Dataset username={username} dataset={app_context.dataset} />,
        document.getElementById('app')
    );
});
