CREATE TABLE IF NOT EXISTS location_states (
    id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_location_states_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS location_cities (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    state_id SMALLINT UNSIGNED NOT NULL,
    name VARCHAR(120) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_location_cities_state_name (state_id, name),
    KEY idx_location_cities_name (name),
    CONSTRAINT fk_location_cities_state FOREIGN KEY (state_id) REFERENCES location_states(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO location_states (name) VALUES
    ('Andhra Pradesh'),
    ('Arunachal Pradesh'),
    ('Assam'),
    ('Bihar'),
    ('Chhattisgarh'),
    ('Goa'),
    ('Gujarat'),
    ('Haryana'),
    ('Himachal Pradesh'),
    ('Jharkhand'),
    ('Karnataka'),
    ('Kerala'),
    ('Madhya Pradesh'),
    ('Maharashtra'),
    ('Manipur'),
    ('Meghalaya'),
    ('Mizoram'),
    ('Nagaland'),
    ('Odisha'),
    ('Punjab'),
    ('Rajasthan'),
    ('Sikkim'),
    ('Tamil Nadu'),
    ('Telangana'),
    ('Tripura'),
    ('Uttar Pradesh'),
    ('Uttarakhand'),
    ('West Bengal'),
    ('Andaman and Nicobar Islands'),
    ('Chandigarh'),
    ('Dadra and Nagar Haveli and Daman and Diu'),
    ('Delhi'),
    ('Jammu and Kashmir'),
    ('Ladakh'),
    ('Lakshadweep'),
    ('Puducherry');

INSERT IGNORE INTO location_cities (state_id, name)
SELECT location_states.id, city_options.city_name
FROM location_states
JOIN (
    SELECT 'Andhra Pradesh' AS state_name, 'Amaravati' AS city_name UNION ALL
    SELECT 'Andhra Pradesh', 'Guntur' UNION ALL
    SELECT 'Andhra Pradesh', 'Tirupati' UNION ALL
    SELECT 'Andhra Pradesh', 'Vijayawada' UNION ALL
    SELECT 'Andhra Pradesh', 'Visakhapatnam' UNION ALL
    SELECT 'Arunachal Pradesh', 'Itanagar' UNION ALL
    SELECT 'Arunachal Pradesh', 'Naharlagun' UNION ALL
    SELECT 'Arunachal Pradesh', 'Pasighat' UNION ALL
    SELECT 'Assam', 'Dibrugarh' UNION ALL
    SELECT 'Assam', 'Guwahati' UNION ALL
    SELECT 'Assam', 'Jorhat' UNION ALL
    SELECT 'Assam', 'Silchar' UNION ALL
    SELECT 'Bihar', 'Bhagalpur' UNION ALL
    SELECT 'Bihar', 'Gaya' UNION ALL
    SELECT 'Bihar', 'Muzaffarpur' UNION ALL
    SELECT 'Bihar', 'Patna' UNION ALL
    SELECT 'Chhattisgarh', 'Bhilai' UNION ALL
    SELECT 'Chhattisgarh', 'Bilaspur' UNION ALL
    SELECT 'Chhattisgarh', 'Raipur' UNION ALL
    SELECT 'Goa', 'Mapusa' UNION ALL
    SELECT 'Goa', 'Margao' UNION ALL
    SELECT 'Goa', 'Panaji' UNION ALL
    SELECT 'Gujarat', 'Ahmedabad' UNION ALL
    SELECT 'Gujarat', 'Gandhinagar' UNION ALL
    SELECT 'Gujarat', 'Rajkot' UNION ALL
    SELECT 'Gujarat', 'Surat' UNION ALL
    SELECT 'Haryana', 'Faridabad' UNION ALL
    SELECT 'Haryana', 'Gurugram' UNION ALL
    SELECT 'Haryana', 'Hisar' UNION ALL
    SELECT 'Haryana', 'Panipat' UNION ALL
    SELECT 'Himachal Pradesh', 'Dharamshala' UNION ALL
    SELECT 'Himachal Pradesh', 'Mandi' UNION ALL
    SELECT 'Himachal Pradesh', 'Shimla' UNION ALL
    SELECT 'Himachal Pradesh', 'Solan' UNION ALL
    SELECT 'Jharkhand', 'Bokaro' UNION ALL
    SELECT 'Jharkhand', 'Dhanbad' UNION ALL
    SELECT 'Jharkhand', 'Jamshedpur' UNION ALL
    SELECT 'Jharkhand', 'Ranchi' UNION ALL
    SELECT 'Karnataka', 'Bengaluru' UNION ALL
    SELECT 'Karnataka', 'Hubballi' UNION ALL
    SELECT 'Karnataka', 'Mangaluru' UNION ALL
    SELECT 'Karnataka', 'Mysuru' UNION ALL
    SELECT 'Kerala', 'Kochi' UNION ALL
    SELECT 'Kerala', 'Kozhikode' UNION ALL
    SELECT 'Kerala', 'Thiruvananthapuram' UNION ALL
    SELECT 'Kerala', 'Thrissur' UNION ALL
    SELECT 'Madhya Pradesh', 'Bhopal' UNION ALL
    SELECT 'Madhya Pradesh', 'Gwalior' UNION ALL
    SELECT 'Madhya Pradesh', 'Indore' UNION ALL
    SELECT 'Madhya Pradesh', 'Jabalpur' UNION ALL
    SELECT 'Maharashtra', 'Chhatrapati Sambhajinagar' UNION ALL
    SELECT 'Maharashtra', 'Mumbai' UNION ALL
    SELECT 'Maharashtra', 'Nagpur' UNION ALL
    SELECT 'Maharashtra', 'Nashik' UNION ALL
    SELECT 'Maharashtra', 'Pune' UNION ALL
    SELECT 'Manipur', 'Imphal' UNION ALL
    SELECT 'Meghalaya', 'Shillong' UNION ALL
    SELECT 'Mizoram', 'Aizawl' UNION ALL
    SELECT 'Nagaland', 'Dimapur' UNION ALL
    SELECT 'Nagaland', 'Kohima' UNION ALL
    SELECT 'Odisha', 'Bhubaneswar' UNION ALL
    SELECT 'Odisha', 'Cuttack' UNION ALL
    SELECT 'Odisha', 'Rourkela' UNION ALL
    SELECT 'Punjab', 'Amritsar' UNION ALL
    SELECT 'Punjab', 'Jalandhar' UNION ALL
    SELECT 'Punjab', 'Ludhiana' UNION ALL
    SELECT 'Punjab', 'Mohali' UNION ALL
    SELECT 'Rajasthan', 'Ajmer' UNION ALL
    SELECT 'Rajasthan', 'Jaipur' UNION ALL
    SELECT 'Rajasthan', 'Jodhpur' UNION ALL
    SELECT 'Rajasthan', 'Udaipur' UNION ALL
    SELECT 'Sikkim', 'Gangtok' UNION ALL
    SELECT 'Tamil Nadu', 'Chennai' UNION ALL
    SELECT 'Tamil Nadu', 'Coimbatore' UNION ALL
    SELECT 'Tamil Nadu', 'Madurai' UNION ALL
    SELECT 'Tamil Nadu', 'Tiruchirappalli' UNION ALL
    SELECT 'Tamil Nadu', 'Tirunelveli' UNION ALL
    SELECT 'Telangana', 'Hyderabad' UNION ALL
    SELECT 'Telangana', 'Karimnagar' UNION ALL
    SELECT 'Telangana', 'Warangal' UNION ALL
    SELECT 'Tripura', 'Agartala' UNION ALL
    SELECT 'Uttar Pradesh', 'Agra' UNION ALL
    SELECT 'Uttar Pradesh', 'Ghaziabad' UNION ALL
    SELECT 'Uttar Pradesh', 'Kanpur' UNION ALL
    SELECT 'Uttar Pradesh', 'Lucknow' UNION ALL
    SELECT 'Uttar Pradesh', 'Varanasi' UNION ALL
    SELECT 'Uttarakhand', 'Dehradun' UNION ALL
    SELECT 'Uttarakhand', 'Haridwar' UNION ALL
    SELECT 'Uttarakhand', 'Nainital' UNION ALL
    SELECT 'West Bengal', 'Asansol' UNION ALL
    SELECT 'West Bengal', 'Durgapur' UNION ALL
    SELECT 'West Bengal', 'Howrah' UNION ALL
    SELECT 'West Bengal', 'Kolkata' UNION ALL
    SELECT 'Andaman and Nicobar Islands', 'Port Blair' UNION ALL
    SELECT 'Chandigarh', 'Chandigarh' UNION ALL
    SELECT 'Dadra and Nagar Haveli and Daman and Diu', 'Daman' UNION ALL
    SELECT 'Dadra and Nagar Haveli and Daman and Diu', 'Silvassa' UNION ALL
    SELECT 'Delhi', 'Delhi' UNION ALL
    SELECT 'Jammu and Kashmir', 'Jammu' UNION ALL
    SELECT 'Jammu and Kashmir', 'Srinagar' UNION ALL
    SELECT 'Ladakh', 'Leh' UNION ALL
    SELECT 'Ladakh', 'Kargil' UNION ALL
    SELECT 'Lakshadweep', 'Kavaratti' UNION ALL
    SELECT 'Puducherry', 'Karaikal' UNION ALL
    SELECT 'Puducherry', 'Puducherry'
) AS city_options ON city_options.state_name = location_states.name;