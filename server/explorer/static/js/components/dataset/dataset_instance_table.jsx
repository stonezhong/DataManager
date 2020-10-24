import React from 'react'

import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Table from 'react-bootstrap/Table'

/*********************************************************************************
 * Purpose: Show list of dataset instances
 * TODO: pagination
 *
 * Props
 *     dataset               : the dataset object
 *     dataset_instances     : a list of dataset instances
 *
 */
export class DatasetInstanceTable extends React.Component {
    render() {
        return (
            <Row>
                <Col>
                    <h1>Asserts</h1>
                    <Table>
                        <thead thead className="thead-dark">
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
